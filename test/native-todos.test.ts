import { expect, test } from 'bun:test'
import { createMemo, createRoot, createSignal } from 'solid-js'

import { createNativeTodoController } from '../src/app/opencode-v2/native-todo-controller'
import { nativeTodos } from '../src/app/opencode-v2/native-todos'

import type { JsonValue, SessionMessageAssistantTool, SessionMessageInfo } from '@opencode/client'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function message(
  id: string,
  todos: JsonValue,
  status: 'completed' | 'running' | 'streaming' | 'error' = 'completed',
  name = 'todowrite',
): SessionMessageInfo {
  const unfinished: SessionMessageAssistantTool['state'] =
    status === 'running' ? { status, input: { todos }, metadata: {} } : { status: 'streaming', input: '{}' }
  const incomplete: SessionMessageAssistantTool['state'] =
    status === 'error'
      ? { status, input: { todos }, error: { type: 'unknown', message: 'Synthetic failure' } }
      : unfinished
  const state: SessionMessageAssistantTool['state'] =
    status === 'completed'
      ? { status, input: { todos }, content: [{ type: 'text' as const, text: 'Synthetic tool result' }] }
      : incomplete

  return {
    id,
    type: 'assistant',
    agent: 'build',
    model: { providerID: 'synthetic', id: 'synthetic' },
    time: { created: 1 },
    content: [{ type: 'tool', id: `call_${id}`, name, state, time: { created: 1 } }],
  }
}

test('native todos follow completed calls, clearing, tool identity, and the revert boundary', () => {
  const first = message('msg_first', [{ content: 'First', status: 'pending' }])
  const next = message('msg_next', [{ content: 'Next', status: 'completed' }])

  expect(nativeTodos([first, next])).toEqual([{ content: 'Next', status: 'completed' }])
  expect(nativeTodos([first, next], next.id)).toEqual([{ content: 'First', status: 'pending' }])
  expect(nativeTodos([first, next], 'msg_not_loaded')).toEqual([{ content: 'Next', status: 'completed' }])
  expect(
    nativeTodos([first, message('msg_pending', [{ content: 'Unfinished', status: 'completed' }], 'running')]),
  ).toEqual([{ content: 'First', status: 'pending' }])
  expect(nativeTodos([first, message('msg_stream', [], 'streaming')])).toEqual([
    { content: 'First', status: 'pending' },
  ])
  expect(nativeTodos([first, message('msg_other', [], 'completed', 'navigator_todo_write')])).toEqual([
    { content: 'First', status: 'pending' },
  ])
  expect(nativeTodos([first, message('msg_clear', [])])).toEqual([])
  expect(nativeTodos([first], first.id)).toEqual([])
  expect(nativeTodos([first, message('msg_failed', [], 'error')])).toEqual([{ content: 'First', status: 'pending' }])
  const multiple = message('msg_multiple', [{ content: 'Latest', status: 'completed' }])

  if (multiple.type !== 'assistant' || first.type !== 'assistant') throw new Error('Invalid synthetic fixture')

  multiple.content.unshift(...first.content)
  expect(nativeTodos([multiple])).toEqual([{ content: 'Latest', status: 'completed' }])
})

test('native parsing matches the host without legacy limits, priority, or duplicate removal', () => {
  const content = 'A'.repeat(600)
  const rows = Array.from({ length: 105 }, () => ({ content, status: 'in_progress', priority: 'high' }))
  const value = nativeTodos([message('msg_many', rows)])

  expect(value).toHaveLength(105)
  expect(value[0]).toEqual({ content, status: 'in_progress' })
  expect(
    nativeTodos([
      message('msg_invalid', [
        null,
        {},
        { content: '' },
        { content: ' ', status: 'unknown' },
        { content: 'Cancel', status: 'cancelled' },
      ]),
    ]),
  ).toEqual([
    { content: ' ', status: 'pending' },
    { content: 'Cancel', status: 'cancelled' },
  ])
})

test('the native controller stays reactive to host snapshots and revert without server RPC', async () => {
  const [messages, setMessages] = createSignal<SessionMessageInfo[]>([])
  const [boundary, setBoundary] = createSignal<string>()
  const lifecycle = new AbortController()
  let calls = 0
  let fail = false
  const context = {
    data: {
      session: {
        get: () => ({ revert: boundary() ? { messageID: boundary() } : undefined }),
        sync: async () => {},
        message: {
          list: () => messages(),
          sync: async () => {
            calls++

            if (fail) throw new Error('Native refresh failed')
          },
        },
      },
    },
  } as unknown as Plugin.Context
  const api = {
    state: { session: { get: () => ({ directory: '/synthetic' }) }, path: { directory: '/synthetic' } },
    lifecycle: { signal: lifecycle.signal },
  } as unknown as TuiPluginApi
  const controller = createNativeTodoController(context, api)
  let list!: () => ReturnType<typeof controller.list>
  const dispose = createRoot((cleanup) => {
    list = createMemo(() => controller.list('ses_one'))

    return cleanup
  })

  try {
    const first = message('msg_first', [{ content: 'Live', status: 'in_progress' }])
    const second = message('msg_second', [{ content: 'Done', status: 'completed' }])

    setMessages([first])
    expect(list()[0]?.content).toBe('Live')
    const pending = controller.refresh('ses_one')

    expect(controller.refresh('ses_one')).toBe(pending)
    await pending
    expect(calls).toBe(1)
    setMessages([first, second])
    expect(list()[0]?.content).toBe('Done')
    setBoundary(second.id)
    expect(list()[0]?.content).toBe('Live')
    fail = true
    await expect(controller.refresh('ses_one')).rejects.toThrow('Native refresh failed')
    expect(controller.state('ses_one').status).toBe('error')
    expect(list()[0]?.content).toBe('Live')
    fail = false
    await controller.retry('ses_one')
    expect(controller.state('ses_one').status).toBe('ready')
    lifecycle.abort()
    const before = calls

    await controller.refresh('ses_one')
    expect(calls).toBe(before)
  } finally {
    dispose()
    lifecycle.abort()
  }
})

test('a late native refresh failure cannot replace the current session state', async () => {
  const lifecycle = new AbortController()
  let rejectOld!: (error: Error) => void
  const old = new Promise<void>((_resolve, reject) => {
    rejectOld = reject
  })
  const context = {
    data: {
      session: {
        get: () => ({}),
        sync: async () => {},
        message: {
          list: () => [],
          sync: async (sessionID: string) => {
            if (sessionID === 'ses_old') await old
          },
        },
      },
    },
  } as unknown as Plugin.Context
  const api = {
    state: { session: { get: () => ({ directory: '/synthetic' }) }, path: { directory: '/synthetic' } },
    lifecycle: { signal: lifecycle.signal },
  } as unknown as TuiPluginApi
  const controller = createNativeTodoController(context, api)
  const deactivate = controller.activate('ses_old')
  const pending = controller.refresh('ses_old')

  deactivate()
  controller.activate('ses_current')
  try {
    await controller.refresh('ses_current')
    rejectOld(new Error('Old session failed'))
    await expect(pending).rejects.toThrow('Old session failed')
    expect(controller.state('ses_current').status).toBe('ready')
    expect(controller.list('ses_current')).toEqual([])
  } finally {
    lifecycle.abort()
  }
})
