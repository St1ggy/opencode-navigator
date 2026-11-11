import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'
import { subscribeGuiSubagents } from '../../src/app/gui/adapters/subagent-events'
import { createGuiSubagentSource } from '../../src/app/gui/adapters/subagent-source'
import { createGuiTodoSource } from '../../src/app/gui/adapters/todo-source'

import type { SubagentEvent } from '../../src/entities/subagent/model'
import type { MountedSession } from '@opencode/plugin/gui'

type NativeEvent = Parameters<Parameters<MountedSession['server']['data']['listen']>[0]>[0]

function fixture() {
  const calls: string[] = []
  const listeners = new Set<(event: NativeEvent) => void>()
  const parent = {
    id: 'parent',
    title: 'Synthetic parent',
    location: { directory: '/synthetic/project' },
    time: { created: 1, updated: 2 },
    revert: undefined as { messageID: string } | undefined,
  }
  const child = {
    id: 'child',
    parentID: 'parent',
    title: 'Synthetic child',
    location: parent.location,
    time: { created: 1, updated: 2, busy: 100, idle: 50 },
  }
  const todo = {
    id: 'todo-message',
    type: 'assistant',
    content: [
      {
        type: 'tool',
        name: 'todowrite',
        state: { status: 'completed', input: { todos: [{ content: 'Synthetic Todo', status: 'pending' }] } },
      },
    ],
  }
  const message = {
    id: 'child-message',
    type: 'assistant',
    time: { created: 1 },
    retry: { attempt: 2, at: 500, error: { message: 'Synthetic retry' } },
    content: [],
  }
  const session = {
    id: 'parent',
    directory: '/synthetic/project',
    visit: {},
    pending: false,
    location: parent.location,
    server: {
      id: 'remote-server',
      compatible: true,
      connected: true,
      client: {
        session: {
          list: async () => {
            calls.push('remote-list')

            return { data: [child], cursor: { next: null } }
          },
        },
      },
      data: {
        listen(listener: (event: NativeEvent) => void) {
          listeners.add(listener)

          return () => {
            listeners.delete(listener)
          }
        },
        session: {
          list: () => [parent, child],
          get: (id: string) => (id === 'parent' ? parent : child),
          status: () => 'running',
          sync: async (id: string) => {
            calls.push(`sync:${id}`)
          },
          message: {
            list: (id: string) => (id === 'parent' ? [todo] : [message]),
            sync: async (id: string) => {
              calls.push(`messages:${id}`)
            },
          },
        },
      },
    },
  }
  const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
  const scope = access.capture()!

  return {
    calls,
    access,
    scope,
    listeners,
    emit(details: unknown) {
      for (const listener of listeners) listener({ details } as NativeEvent)
    },
    parent,
    child,
    session,
    todo: createGuiTodoSource(access, scope),
    subagents: createGuiSubagentSource(access, scope),
  }
}

test('GUI Todo projects native completed tools and reverts from the selected remote cache', async () => {
  const context = fixture()

  expect(context.todo.list('parent')).toEqual([{ content: 'Synthetic Todo', status: 'pending' }])
  await context.todo.refresh('parent', new AbortController().signal)
  expect(context.calls).toEqual(['sync:parent', 'messages:parent'])
  context.parent.revert = { messageID: 'todo-message' }
  expect(context.todo.list('parent')).toEqual([])
  expect(() => context.todo.list('foreign-session')).toThrow('session changed')
})

test('retired GUI monitoring sources are inert during normal route teardown, but requests still reject', async () => {
  const context = fixture()

  context.session.visit = {}
  expect(context.todo.list('parent')).toEqual([])
  expect(context.subagents.list('parent')).toEqual([])
  expect(context.subagents.status('child')).toEqual({ type: 'idle' })
  expect(context.subagents.startedAt?.('child')).toBeUndefined()
  await Promise.resolve(
    expect(context.todo.refresh('parent', new AbortController().signal)).rejects.toThrow('session or server changed'),
  )
  await Promise.resolve(
    expect(context.subagents.refresh('parent', new AbortController().signal)).rejects.toThrow(
      'session or server changed',
    ),
  )
  expect(context.calls).toEqual([])
})

test('GUI native Subagent events update immediately and unsubscribe with their owner', () => {
  const events: SubagentEvent[] = []
  const root = createRoot((dispose) => {
    const context = fixture()
    const stop = subscribeGuiSubagents({
      access: context.access,
      scope: context.scope,
      source: context.subagents,
      listener: (event) => {
        events.push(event)
      },
    })

    return { context, dispose, stop }
  })
  const { context } = root

  try {
    expect(context.listeners.size).toBe(1)
    context.emit({ type: 'session.execution.started', data: { sessionID: 'child' } })
    expect(context.subagents.status('child')).toEqual({ type: 'busy' })
    context.emit({
      type: 'session.retry.scheduled',
      data: { sessionID: 'child', attempt: 3, at: 900, error: { message: 'Synthetic retry event' } },
    })
    expect(context.subagents.status('child')).toEqual({
      type: 'retry',
      attempt: 3,
      next: 900,
      message: 'Synthetic retry event',
    })
    context.emit({
      type: 'session.execution.failed',
      data: { sessionID: 'child', error: { type: 'SyntheticError', message: 'Synthetic failure' } },
    })
    expect(events.some((event) => event.type === 'error' && event.sessionID === 'child')).toBe(true)
    expect(context.subagents.status('child')).toEqual({ type: 'idle' })
    context.session.visit = {}
    const count = events.length

    context.emit({ type: 'session.execution.started', data: { sessionID: 'child' } })
    expect(events).toHaveLength(count)
    root.stop()
    expect(context.listeners.size).toBe(0)
  } finally {
    root.dispose()
  }
})

test('GUI Subagents retain stable native projections, observed timing and retry state', async () => {
  const context = fixture()
  const first = context.subagents.list('parent')[0]

  expect(context.subagents.list('parent')[0]).toBe(first)
  expect(first.title).toBe('Synthetic child')
  expect(context.subagents.status('child')).toEqual({
    type: 'retry',
    attempt: 2,
    next: 500,
    message: 'Synthetic retry',
  })
  expect(context.subagents.startedAt?.('child')).toBe(100)
  await context.subagents.refresh('parent', new AbortController().signal)
  expect(context.calls).toEqual(['remote-list'])
  context.child.time.idle = 150
  expect(context.subagents.startedAt?.('child')).toBeUndefined()
  context.session.server.connected = false
  expect(context.subagents.list('parent')[0]).toBe(first)
  await Promise.resolve(
    expect(context.subagents.refresh('parent', new AbortController().signal)).rejects.toThrow('offline'),
  )
})
