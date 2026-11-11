import { createTodoModel } from './model/todo-controller'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createTodoController(api: TuiPluginApi) {
  const target = (sessionID: string) => {
    const session = api.state.session.get(sessionID)
    const directory = session?.directory ?? api.state.path.directory
    const workspace = session?.workspaceID

    return {
      key: JSON.stringify([sessionID, directory, workspace ?? null]),
      sessionID,
      routing: { directory, ...(workspace && { workspace }) },
    }
  }

  return createTodoModel({
    lifecycle: api.lifecycle,
    target,
    cache: 'model',
    source: {
      list: (sessionID) => api.state.session.todo(sessionID),
      async refresh(sessionID, signal) {
        const result = await api.client.session.todo(
          { sessionID, ...target(sessionID).routing },
          { throwOnError: true, signal },
        )

        return result.data ?? []
      },
      subscribe: (listener) =>
        api.event.on('todo.updated', (event) => listener(event.properties.sessionID, event.properties.todos)),
    },
  })
}
