import { createSignal } from 'solid-js'

import { createRequestState } from '../../../shared/lib/request-state'

import { NavigatorTodoRpc } from './navigator-rpc'
import { type NavigatorTodoState, normalizeTodoState } from './navigator-state'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createNavigatorTodoController(context: Plugin.Context, api: TuiPluginApi) {
  const rpc = context.client.rpc(NavigatorTodoRpc)
  const [sessions, setSessions] = createSignal<Record<string, NavigatorTodoState>>({})
  const [saving, setSaving] = createSignal<Record<string, boolean>>({})
  const [errors, setErrors] = createSignal<Record<string, string | undefined>>({})
  const requests = createRequestState(api.lifecycle.signal)
  const refreshing = new Map<string, Promise<NavigatorTodoState>>()
  const revisions = new Map<string, number>()
  let activeTarget: string | undefined

  function target(sessionID: string) {
    const session = api.state.session.get(sessionID)
    const directory = session?.directory ?? api.state.path.directory
    const workspace = session?.workspaceID

    return { key: JSON.stringify([sessionID, directory, workspace ?? null]), sessionID, routing: { directory } }
  }

  function set(key: string, value: NavigatorTodoState) {
    setSessions((current) => ({ ...current, [key]: normalizeTodoState(value) }))
  }

  function refresh(sessionID: string, force = false) {
    const current = target(sessionID)
    const pending = refreshing.get(current.key)

    if (pending && !force) return pending

    const revision = revisions.get(current.key) ?? 0
    const requestState = requests.start(current.key, 'refresh Navigator todos', current.key in sessions(), force)

    if (!requestState) return pending!

    const request = rpc
      .list({ sessionID }, { location: current.routing, signal: requestState.signal })
      .then((value) => {
        const state = normalizeTodoState(value)

        if (requestState.isCurrent() && (revisions.get(current.key) ?? 0) === revision) set(current.key, state)

        requestState.succeed()

        return state
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

  const unsubscribe = rpc.events.on('updated', (event) => {
    const { sessionID } = event.data

    if (typeof sessionID !== 'string') return

    const current = target(sessionID)

    if (event.location.directory !== current.routing.directory) return

    revisions.set(current.key, (revisions.get(current.key) ?? 0) + 1)
    set(current.key, normalizeTodoState(event.data))
  })

  api.lifecycle.onDispose(unsubscribe)

  return {
    target,
    list(sessionID: string) {
      return sessions()[target(sessionID).key]?.todos ?? []
    },
    refresh,
    state(sessionID: string) {
      return requests.state(target(sessionID).key)
    },
    retry(sessionID: string) {
      return refresh(sessionID, true)
    },
    guidance(sessionID: string) {
      const key = target(sessionID).key

      return {
        enabled: sessions()[key]?.guidance ?? false,
        saving: saving()[key] ?? false,
        error: errors()[key],
        available: key in sessions(),
      }
    },
    async setGuidance(sessionID: string, enabled: boolean) {
      const current = target(sessionID)

      if (!(current.key in sessions()) || saving()[current.key]) return

      setSaving((value) => ({ ...value, [current.key]: true }))
      setErrors((value) => ({ ...value, [current.key]: undefined }))

      try {
        const state = await rpc.guidance({ sessionID, enabled }, { location: current.routing })

        revisions.set(current.key, (revisions.get(current.key) ?? 0) + 1)
        set(current.key, normalizeTodoState(state))
      } catch (error) {
        setErrors((value) => ({ ...value, [current.key]: error instanceof Error ? error.message : String(error) }))
      } finally {
        setSaving((value) => ({ ...value, [current.key]: false }))
      }
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

export type NavigatorTodoController = ReturnType<typeof createNavigatorTodoController>
