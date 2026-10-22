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

test('the server preserves the previous Todo list as a read-only archive without a parallel agent tool', async () => {
  const saved: NavigatorTodoState = { todos: [{ content: 'Previous task', status: 'pending' }], guidance: true }
  const stored = new Map<string, unknown>([['session.todo.ses_one', saved]])
  let disposed = 0
  let methods!: Record<string, (input: unknown) => Promise<NavigatorTodoState>>
  const host = {
    storage: {
      get: async (key: string) => stored.get(key),
      set: async () => {
        throw new Error('Archive must never write storage')
      },
    },
    rpc: {
      register: async (definition: { methods: object }, handlers: typeof methods) => {
        expect(Object.keys(definition.methods)).toEqual(['list'])
        methods = handlers

        return {
          dispose: async () => {
            disposed++
          },
        }
      },
    },
    tool: {
      transform: async () => {
        throw new Error('Native Todo must remain the host tool')
      },
    },
    session: {
      hook: async () => {
        throw new Error('Navigator Todo guidance must be retired')
      },
    },
  } as unknown as Plugin.Context
  const dispose = await server.setup(host)

  expect(await methods.list({ sessionID: 'ses_one' })).toEqual(saved)
  expect((await methods.list({ sessionID: 'ses_two' })).todos).toEqual([])
  expect(stored.get('session.todo.ses_one')).toBe(saved)
  expect(stored.size).toBe(1)
  await dispose?.()
  expect(disposed).toBe(1)
})

test('the provider-quota server keeps its RPC and HTTP hooks independently of native Todo', async () => {
  const registrations = new Map<string, Record<string, (input: unknown) => Promise<unknown>>>()
  const hooks: string[] = []
  const disposed: string[] = []
  const host = {
    storage: { get: async () => {} },
    rpc: {
      register: async (definition: { id: string }, methods: Record<string, (input: unknown) => Promise<unknown>>) => {
        registrations.set(definition.id, methods)

        return {
          events: { emit: async () => {} },
          dispose: async () => {
            disposed.push(definition.id)
          },
        }
      },
    },
    provider: { get: async () => ({}), list: async () => ({ data: [] }) },
    integration: { connection: { active: async () => {} } },
    session: {
      hook: async (name: string) => {
        hooks.push(name)

        return {
          dispose: async () => {
            disposed.push(name)
          },
        }
      },
    },
    event: {
      async *subscribe() {
        yield* []
      },
    },
  } as unknown as Plugin.Context
  const dispose = await server.setup(host)

  expect(hooks).toEqual(['http.request', 'http.response'])
  expect(Array.isArray(await registrations.get('opencode-navigator.quotas')!.capabilities({}))).toBe(true)
  expect(Object.keys(registrations.get('opencode-navigator.todo')!)).toEqual(['list'])
  await dispose?.()
  expect(disposed).toContain('opencode-navigator.quotas')
  expect(disposed).toContain('opencode-navigator.todo')
})
