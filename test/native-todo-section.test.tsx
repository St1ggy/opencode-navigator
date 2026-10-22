/** @jsxImportSource @opentui/solid */
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui'
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { createNativeTodoController } from '../src/app/opencode-v2/native-todo-controller'
import { TodoSection } from '../src/pages/session-sidebar'
import { IconProvider } from '../src/shared/ui'

import type { PreferencesController } from '../src/entities/preferences'
import type { SessionMessageInfo } from '@opencode/client'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('native Todo renders filters and progress, reacts to the host, and refreshes without a Todo server', async () => {
  const [messages, setMessages] = createSignal<SessionMessageInfo[]>([
    {
      id: 'msg_tasks',
      type: 'assistant',
      agent: 'build',
      model: { providerID: 'synthetic', id: 'model' },
      time: { created: 1 },
      content: [
        {
          type: 'tool',
          id: 'call_tasks',
          name: 'todowrite',
          time: { created: 1 },
          state: {
            status: 'completed',
            input: {
              todos: [
                { content: 'Live task', status: 'in_progress' },
                { content: 'Done task', status: 'completed' },
                { content: 'Pending task', status: 'pending' },
                { content: 'Cancelled task', status: 'cancelled' },
              ],
            },
            content: [{ type: 'text', text: 'Todos updated' }],
          },
        },
      ],
    },
  ])
  const lifecycle = new AbortController()
  let reads = 0
  const context = {
    data: {
      session: {
        get: () => ({}),
        sync: async () => {},
        message: {
          list: () => messages(),
          sync: async () => {
            reads++
          },
        },
      },
    },
  } as unknown as Plugin.Context
  const preferences = {
    expanded: () => ({ todo: true }),
    toggleSectionExpanded() {},
  } as unknown as PreferencesController

  function Harness() {
    const renderer = useRenderer()
    const api = {
      renderer,
      keymap: createDefaultOpenTuiKeymap(renderer),
      lifecycle: { signal: lifecycle.signal },
      state: { path: { directory: '/synthetic' }, session: { get: () => ({ directory: '/synthetic' }) } },
      theme: {
        current: {
          text: '#ffffff',
          textMuted: '#aaaaaa',
          accent: '#ffaa00',
          primary: '#aaffaa',
          selectedListItemText: '#000000',
          background: '#101010',
          backgroundPanel: '#202020',
          backgroundElement: '#404040',
          success: '#00ff00',
          warning: '#ffff00',
          error: '#ff0000',
        },
      },
    } as unknown as TuiPluginApi
    const controller = createNativeTodoController(context, api)

    return (
      <IconProvider style={() => 'text'}>
        <TodoSection api={api} preferences={preferences} controller={controller} sessionID="ses_one" />
      </IconProvider>
    )
  }
  const h = await testRender(() => <Harness />, { width: 56, height: 25 })

  try {
    await h.flush()
    const frame = h.captureCharFrame()

    expect(frame).toContain('1/4')
    expect(frame).toContain('Live task')
    expect(frame).toContain('Done task')
    expect(frame).toContain('Native OpenCode Todo')
    expect(frame).not.toContain('Todo instructions')
    expect(frame).not.toContain('separate OpenCode 2 server plugin')
    const lines = frame.split('\n')
    const tabs = lines.findIndex((line) => line.includes('Active'))

    await h.mockMouse.click(lines[tabs].indexOf('Active'), tabs)
    await h.flush()
    expect(h.captureCharFrame()).toContain('Pending task')
    expect(h.captureCharFrame()).not.toContain('Done task')
    const before = reads
    const header = h
      .captureCharFrame()
      .split('\n')
      .findIndex((line) => line.includes('Refresh'))

    await h.mockMouse.click(h.captureCharFrame().split('\n')[header].indexOf('Refresh'), header)
    await h.flush()
    expect(reads).toBeGreaterThan(before)
    setMessages([])
    await h.flush()
    expect(h.captureCharFrame()).toContain('0/0')
    expect(h.captureCharFrame()).toContain('No tasks yet')
  } finally {
    lifecycle.abort()
    h.renderer.destroy()
  }
})
