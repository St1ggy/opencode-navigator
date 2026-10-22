import { createRequestState } from '../../shared/lib/request-state'

import { nativeTodos } from './native-todos'

import type { SidebarTodo, TodoController } from '../../entities/todo'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createNativeTodoController(context: Plugin.Context, api: TuiPluginApi): TodoController {
  const requests = createRequestState(api.lifecycle.signal)
  const pending = new Map<string, Promise<readonly SidebarTodo[]>>()
  let activeTarget: string | undefined

  function target(sessionID: string) {
    const session = api.state.session.get(sessionID)
    const directory = session?.directory ?? api.state.path.directory
    const workspace = session?.workspaceID

    return {
      key: JSON.stringify([sessionID, directory, workspace ?? null]),
      sessionID,
      routing: { directory, ...(workspace && { workspace }) },
    }
  }

  function list(sessionID: string) {
    return nativeTodos(
      context.data.session.message.list(sessionID),
      context.data.session.get(sessionID)?.revert?.messageID,
    )
  }

  function refresh(sessionID: string, force = false): Promise<readonly SidebarTodo[]> {
    if (api.lifecycle.signal.aborted) return Promise.resolve([])

    const current = target(sessionID)
    const existing = pending.get(current.key)

    if (existing && !force) return existing

    const requestState = requests.start(
      current.key,
      'refresh native todos',
      context.data.session.message.list(sessionID).length > 0,
      force,
    )

    if (!requestState) return existing!

    const request = Promise.try(() =>
      Promise.all([context.data.session.sync(sessionID), context.data.session.message.sync(sessionID)]),
    )
      .then(() => {
        if (!requestState.isCurrent()) return []

        requestState.succeed()

        return list(sessionID)
      })
      .catch((error) => {
        requestState.fail(error)
        throw error
      })
      .finally(() => {
        requestState.finish()

        if (pending.get(current.key) === request) pending.delete(current.key)
      })

    pending.set(current.key, request)

    return request
  }

  return {
    source: 'native',
    target,
    list,
    refresh,
    state: (sessionID) => requests.state(target(sessionID).key),
    retry: (sessionID) => refresh(sessionID, true),
    activate(sessionID) {
      const key = target(sessionID).key

      if (activeTarget !== key) {
        requests.abortAll()
        pending.clear()
        activeTarget = key
      }

      return () => {
        if (activeTarget !== key) return

        activeTarget = undefined
        requests.abortAll()
        pending.clear()
      }
    },
  }
}
