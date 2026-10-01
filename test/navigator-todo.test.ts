import { expect, test } from 'bun:test'

import { type NavigatorTodoState, createManagedTodos } from '../src/entities/todo/server'
import server from '../src/server'

import type { Plugin } from '@opencode/plugin'

test('Navigator Todo persists isolated session lists and serializes simultaneous changes', async () => {
  const stored = new Map<string, NavigatorTodoState>()
  const events: { sessionID: string; state: NavigatorTodoState }[] = []
  const storage = {
    get: async (key: string) => stored.get(key),
    set: async (key: string, value: NavigatorTodoState) => {
      await Promise.resolve()
      stored.set(key, value)
    },
  }
  const todos = createManagedTodos(storage, async (sessionID, state) => {
    events.push({ sessionID, state })
  })

  expect(await todos.list('ses_one')).toEqual({ todos: [], guidance: false })
  await Promise.all([
    todos.replace('ses_one', [{ content: 'Review', status: 'in_progress' }]),
    todos.guidance('ses_one', true),
  ])
  await todos.replace('ses_two', [{ content: 'Publish', status: 'pending' }])

  expect(await createManagedTodos(storage, async () => {}).list('ses_one')).toEqual({
    todos: [{ content: 'Review', status: 'in_progress' }],
    guidance: true,
  })
  expect((await todos.list('ses_two')).guidance).toBe(false)
  expect(events.map((event) => event.sessionID)).toEqual(['ses_one', 'ses_one', 'ses_two'])
})

test('the server exposes Todo RPC and agent tool independently of opt-in context instructions', async () => {
  const stored = new Map<string, unknown>()
  const emitted: unknown[] = []
  const disposed: string[] = []
  let methods!: Record<string, (input: unknown) => Promise<NavigatorTodoState>>
  let execute!: (input: unknown, context: { sessionID: string }) => Promise<{ content: string }>
  let contextHook!: (event: { sessionID: string; system: { type: string; text: string }[] }) => Promise<void>
  const host = {
    storage: {
      get: async (key: string) => stored.get(key),
      set: async (key: string, value: unknown) => {
        stored.set(key, value)
      },
    },
    rpc: {
      register: async (_definition: unknown, handlers: typeof methods) => {
        methods = handlers

        return {
          events: {
            emit: async (_name: string, data: unknown) => {
              emitted.push(data)
            },
          },
          dispose: async () => {
            disposed.push('rpc')
          },
        }
      },
    },
    tool: {
      transform: async (register: (editor: unknown) => void) => {
        register({
          namespace: () => {},
          add: (tool: { execute: typeof execute }) => {
            execute = tool.execute
          },
        })

        return {
          dispose: async () => {
            disposed.push('tool')
          },
        }
      },
    },
    session: {
      hook: async (_name: string, handler: typeof contextHook) => {
        contextHook = handler

        return {
          dispose: async () => {
            disposed.push('context')
          },
        }
      },
    },
  } as unknown as Plugin.Context
  const dispose = await server.setup(host)
  const session = { sessionID: 'ses_one', system: [] as { type: string; text: string }[] }

  await contextHook(session)
  expect(session.system).toEqual([])
  expect(await methods.list({ sessionID: 'ses_one' })).toEqual({ todos: [], guidance: false })
  expect(await execute({ todos: [{ content: 'Review', status: 'in_progress' }] }, { sessionID: 'ses_one' })).toEqual({
    content: 'Navigator Todo updated: 1 tasks.',
  })
  expect((await methods.list({ sessionID: 'ses_two' })).todos).toEqual([])
  await contextHook(session)
  expect(session.system).toEqual([])
  await methods.guidance({ sessionID: 'ses_one', enabled: true })
  await contextHook(session)
  expect(session.system[0].text).toContain('navigator_todo_write')
  expect(session.system[0].text).toContain('Review')
  expect(emitted).toHaveLength(2)
  await dispose?.()
  expect(disposed).toEqual(['context', 'tool', 'rpc'])
})
