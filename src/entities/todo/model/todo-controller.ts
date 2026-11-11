import { createSignal } from 'solid-js'

import { createRequestState } from '../../../shared/lib/request-state'

import type { Lifecycle } from '../../../shared/lib/lifecycle'
import type { NativeTodoSetup } from './native-todo-setup'
import type { SidebarTodo, TodoSource, TodoTarget } from './types'

export type { SidebarTodo } from './types'

export function createTodoModel(options: {
  lifecycle: Lifecycle
  target(sessionID: string): TodoTarget
  source: TodoSource
  cache: 'source' | 'model'
  hasValue?(sessionID: string): boolean
}) {
  const [sessions, setSessions] = createSignal<Record<string, readonly SidebarTodo[]>>({})
  const refreshing = new Map<string, Promise<readonly SidebarTodo[]>>()
  const revisions = new Map<string, number>()
  const requests = createRequestState(options.lifecycle.signal)
  let activeTarget: string | undefined
  let leases = new Set<symbol>()

  function target(sessionID: string): TodoTarget {
    return options.target(sessionID)
  }

  function set(current: TodoTarget, todos: readonly SidebarTodo[]) {
    setSessions((value) => ({ ...value, [current.key]: todos }))
  }

  function list(sessionID: string) {
    const current = target(sessionID)

    return options.cache === 'source'
      ? options.source.list(sessionID)
      : (sessions()[current.key] ?? options.source.list(sessionID))
  }

  function refresh(sessionID: string, force = false): Promise<readonly SidebarTodo[]> {
    if (options.lifecycle.signal.aborted) return Promise.resolve([])

    const current = target(sessionID)
    const pending = refreshing.get(current.key)

    if (pending && !force) return pending

    const revision = revisions.get(current.key) ?? 0
    const requestState = requests.start(
      current.key,
      'refresh todos',
      current.key in sessions() || Boolean(options.hasValue?.(sessionID)),
      force,
    )

    if (!requestState) return pending!

    const request = Promise.try(() => options.source.refresh(sessionID, requestState.signal))
      .then((todos) => {
        if (!requestState.isCurrent()) return []

        if (options.cache === 'model' && (revisions.get(current.key) ?? 0) === revision) set(current, todos)

        requestState.succeed()

        return todos
      })
      .catch((error) => {
        requestState.fail(error)
        throw error
      })
      .finally(() => {
        requestState.finish()

        if (refreshing.get(current.key) === request) refreshing.delete(current.key)
      })

    refreshing.set(current.key, request)

    return request
  }

  const unsubscribe = options.source.subscribe?.((sessionID, todos) => {
    const current = target(sessionID)

    revisions.set(current.key, (revisions.get(current.key) ?? 0) + 1)
    set(current, todos)
  })

  if (unsubscribe) options.lifecycle.onDispose(unsubscribe)

  return {
    target,
    list,
    refresh,
    state(sessionID: string) {
      return requests.state(target(sessionID).key)
    },
    retry(sessionID: string) {
      return refresh(sessionID, true)
    },
    activate(sessionID: string) {
      const key = target(sessionID).key

      if (activeTarget !== key) {
        requests.abortAll()
        refreshing.clear()
        activeTarget = key
        leases = new Set()
      }

      const lease = Symbol(key)

      leases.add(lease)

      return () => {
        if (activeTarget !== key || !leases.delete(lease) || leases.size > 0) return

        activeTarget = undefined
        requests.abortAll()
        refreshing.clear()
      }
    },
  }
}

export type TodoController = ReturnType<typeof createTodoModel> & { source?: 'native'; setup?: NativeTodoSetup }
