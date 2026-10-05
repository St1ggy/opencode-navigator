import { Plugin } from '@opencode/plugin'

import { type NavigatorTodoItem, NavigatorTodoRpc, createManagedTodos, todoGuidance } from '../../entities/todo/server'
import { setupProviderQuotaServer } from '../../features/provider-limits/server'

const input = {
  type: 'object',
  properties: {
    todos: NavigatorTodoRpc.methods.replace.input.properties.todos,
  },
  required: ['todos'],
  additionalProperties: false,
} as const

const noNotify = async () => {}

export default Plugin.define({
  id: 'opencode-navigator.todo-server',
  async setup(host) {
    let notify: (
      sessionID: string,
      state: Awaited<ReturnType<ReturnType<typeof createManagedTodos>['list']>>,
    ) => Promise<void> = noNotify
    const todos = createManagedTodos(
      {
        get: (key) => host.storage.get(key),
        set: (key, value) => host.storage.set(key, value),
      },
      (sessionID, state) => notify(sessionID, state),
    )
    const rpc = await host.rpc.register(NavigatorTodoRpc, {
      list: async (value) => todos.list((value as { sessionID: string }).sessionID),
      replace: async (value) => {
        const { sessionID, todos: items } = value as { sessionID: string; todos: NavigatorTodoItem[] }

        return todos.replace(sessionID, items)
      },
      guidance: async (value) => {
        const { sessionID, enabled } = value as { sessionID: string; enabled: boolean }

        return todos.guidance(sessionID, enabled)
      },
    })

    notify = (sessionID, state) => rpc.events.emit('updated', { sessionID, ...state })
    const tools = await host.tool.transform((editor) => {
      editor.namespace({ name: 'navigator', description: 'Navigator session tasks' })
      editor.add({
        name: 'todo_write',
        description: 'Replace the Navigator Todo list for this session with the current tasks and their statuses.',
        input,
        options: { namespace: 'navigator' },
        execute: async (value, context) => {
          const state = await todos.replace(context.sessionID, (value as { todos: NavigatorTodoItem[] }).todos)

          return { content: `Navigator Todo updated: ${state.todos.length} tasks.` }
        },
      })
    })
    const context = await host.session.hook('context', async (event) => {
      const state = await todos.list(event.sessionID)

      if (state.guidance) event.system.push({ type: 'text', text: todoGuidance(state) })
    })
    const quotaCleanup =
      typeof host.integration?.connection?.active === 'function' && typeof host.provider?.get === 'function'
        ? await setupProviderQuotaServer(host)
        : undefined

    return async () => {
      await quotaCleanup?.()
      await context.dispose()
      await tools.dispose()
      await rpc.dispose()
    }
  },
})
