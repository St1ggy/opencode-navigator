import { createSignal } from 'solid-js'

import { createRequestState } from './request-state'

import type { TuiPluginApi, TuiSidebarTodoItem } from '@opencode-ai/plugin/tui'

export type SidebarTodo = TuiSidebarTodoItem & { priority?: string }

type TodoTarget = {
  key: string
  sessionID: string
  routing: { directory: string; workspace?: string }
}

export function createTodoController(api: TuiPluginApi) {
  const [sessions, setSessions] = createSignal<Record<string, readonly SidebarTodo[]>>({})
  const refreshing = new Map<string, Promise<readonly SidebarTodo[]>>()
  const revisions = new Map<string, number>()
  const requests = createRequestState(api.lifecycle.signal)
  let activeTarget: string | undefined

  function target(sessionID: string): TodoTarget {
    const session = api.state.session.get(sessionID)
    const directory = session?.directory ?? api.state.path.directory
    const workspace = session?.workspaceID

    return {
      key: JSON.stringify([sessionID, directory, workspace ?? null]),
      sessionID,
      routing: { directory, ...(workspace && { workspace }) },
    }
  }

  function set(current: TodoTarget, todos: readonly SidebarTodo[]) {
    setSessions((value) => ({ ...value, [current.key]: todos }))
  }

  function list(sessionID: string) {
    const current = target(sessionID)

    return sessions()[current.key] ?? api.state.session.todo(sessionID)
  }

  async function refresh(sessionID: string, force = false) {
    const current = target(sessionID)
    const pending = refreshing.get(current.key)

    if (pending && !force) return pending

    const revision = revisions.get(sessionID) ?? 0
    const requestState = requests.start(current.key, 'refresh todos', current.key in sessions(), force)

    if (!requestState) return pending!

    const request = api.client.session
      .todo({ sessionID, ...current.routing }, { throwOnError: true, signal: requestState.signal })
      .then((result) => {
        const todos = result.data ?? []

        if (requestState.isCurrent() && (revisions.get(sessionID) ?? 0) === revision) set(current, todos)

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

  const unsubscribe = api.event.on('todo.updated', (event) => {
    const sessionID = event.properties.sessionID

    revisions.set(sessionID, (revisions.get(sessionID) ?? 0) + 1)
    set(target(sessionID), event.properties.todos)
  })

  api.lifecycle.onDispose(unsubscribe)

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
      }

      return () => {
        if (activeTarget !== key) return

        activeTarget = undefined
        requests.abortAll()
        refreshing.clear()
      }
    },
  }
}

export type TodoController = ReturnType<typeof createTodoController>
