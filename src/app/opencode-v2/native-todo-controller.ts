import { createTodoModel } from '../../entities/todo/model'

import { nativeTodos } from './native-todos'

import type { TodoController } from '../../entities/todo'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Plugin } from '@opencode/plugin/tui'

export function createNativeTodoController(context: Plugin.Context, api: TuiPluginApi): TodoController {
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

  return {
    source: 'native',
    ...createTodoModel({
      lifecycle: api.lifecycle,
      target,
      cache: 'source',
      hasValue: (sessionID) => context.data.session.message.list(sessionID).length > 0,
      source: {
        list,
        async refresh(sessionID, signal) {
          signal.throwIfAborted()
          await Promise.all([context.data.session.sync(sessionID), context.data.session.message.sync(sessionID)])
          signal.throwIfAborted()

          return list(sessionID)
        },
      },
    }),
  }
}
