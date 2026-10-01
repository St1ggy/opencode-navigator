import { expect, test } from 'bun:test'

import { createNavigatorTodoController } from '../src/entities/todo'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('the OpenCode 2 Todo controller ignores stale snapshots and events from another location', async () => {
  let directory = '/project/a'
  let resolveFirst!: (value: unknown) => void
  let onUpdated!: (event: { location: { directory: string }; data: Record<string, unknown> }) => void
  const calls: unknown[] = []
  const context = {
    client: {
      rpc: () => ({
        list: (_input: unknown, options: unknown) => {
          calls.push(options)

          return new Promise((resolve) => {
            resolveFirst = resolve
          })
        },
        guidance: async () => ({ todos: [], guidance: true }),
        events: {
          on: (_name: string, handler: typeof onUpdated) => {
            onUpdated = handler

            return () => {}
          },
        },
      }),
    },
  } as unknown as Plugin.Context
  const api = {
    state: {
      path: { directory: '/project' },
      session: { get: () => ({ directory }) },
    },
    lifecycle: { signal: new AbortController().signal, onDispose: () => {} },
  } as unknown as TuiPluginApi
  const controller = createNavigatorTodoController(context, api)
  const pending = controller.refresh('ses_one')

  onUpdated({
    location: { directory: '/project/a' },
    data: { sessionID: 'ses_one', todos: [{ content: 'Live task', status: 'in_progress' }], guidance: false },
  })
  resolveFirst({ todos: [{ content: 'Stale task', status: 'pending' }], guidance: false })
  await pending
  expect(controller.list('ses_one').map((item) => item.content)).toEqual(['Live task'])
  expect(calls).toMatchObject([{ location: { directory: '/project/a' } }])

  directory = '/project/b'
  expect(controller.list('ses_one')).toEqual([])
  onUpdated({
    location: { directory: '/project/a' },
    data: { sessionID: 'ses_one', todos: [{ content: 'Wrong location', status: 'pending' }], guidance: true },
  })
  expect(controller.list('ses_one')).toEqual([])
})

test('missing Navigator server leaves Todo retryable and does not enable guidance', async () => {
  const context = {
    client: {
      rpc: () => ({
        list: async () => {
          throw new Error('RPC method not found')
        },
        events: { on: () => () => {} },
      }),
    },
  } as unknown as Plugin.Context
  const api = {
    state: { path: { directory: '/project' }, session: { get() {} } },
    lifecycle: { signal: new AbortController().signal, onDispose: () => {} },
  } as unknown as TuiPluginApi
  const controller = createNavigatorTodoController(context, api)

  await expect(controller.refresh('ses_one')).rejects.toThrow('RPC method not found')
  expect(controller.state('ses_one').error?.retryable).toBe(true)
  expect(controller.guidance('ses_one').available).toBe(false)
})
