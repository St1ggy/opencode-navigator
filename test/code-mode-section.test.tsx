/** @jsxImportSource @opentui/solid */
import { RGBA } from '@opentui/core'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { TuiCodeModeContext } from '../src/features/code-mode'
import { createCodeModeController } from '../src/features/code-mode/model'
import { CodeModeRunContent, CodeModeRunView } from '../src/pages/session-sidebar/code-mode'
import { CodeModeActivity } from '../src/pages/session-sidebar/ui/code-mode-activity'
import { McpRoutingControl } from '../src/pages/session-sidebar/ui/mcp-routing-control'
import { IconProvider } from '../src/shared/ui'

import type { CodeModeController, ExecuteRun } from '../src/features/code-mode/model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('TUI activity uses stable public run identity, real payload states and explicit unknown durations', async () => {
  const abort = new AbortController()
  const cleanups: (() => unknown)[] = []
  const [runs, setRuns] = createSignal<ExecuteRun[]>([
    {
      id: 'message:execute',
      messageID: 'message',
      status: 'completed',
      created: 1,
      input: { code: 'synthetic' },
      output: false,
      nested: 'unavailable',
    },
  ])
  const color = RGBA.fromHex('#bbbbbb')
  const api = {
    theme: {
      current: {
        text: color,
        textMuted: color,
        primary: color,
        accent: color,
        backgroundElement: RGBA.fromHex('#222222'),
        selectedListItemText: color,
      },
    },
    ui: { dialog: {} },
    keymap: { registerLayer: () => () => {} },
  } as unknown as TuiPluginApi
  const setup = await testRender(
    () => {
      const model = createCodeModeController(
        {
          supported: true,
          current: () => !abort.signal.aborted,
          runs,
          refresh: async () => {},
          entries: async () => [],
          read: async () => '',
          write: async () => {},
          subscribe: () => () => {},
        },
        { key: 'synthetic', sessionID: 'session', directory: '/synthetic' },
        { signal: abort.signal, onDispose: (cleanup) => cleanups.push(cleanup) },
      )

      return (
        <IconProvider style={() => 'text'}>
          <TuiCodeModeContext.Provider value={model}>
            <CodeModeRunView.Provider value={CodeModeRunContent}>
              <CodeModeActivity api={api} navigationSection={1} />
            </CodeModeRunView.Provider>
          </TuiCodeModeContext.Provider>
        </IconProvider>
      )
    },
    { width: 80, height: 20 },
  )

  try {
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Recent')
    expect(setup.captureCharFrame()).toContain('MCP / method not identified')
    expect(setup.captureCharFrame()).toContain('completed')
    expect(setup.captureCharFrame()).toContain('time ?')
    const original = setup.renderer.root.findDescendantById('navigator.execute.message:execute')

    setRuns([{ ...runs()[0], status: 'error', started: 10, completed: 1210 }])
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('error')
    expect(setup.captureCharFrame()).toContain('1.2s')
    expect(setup.captureCharFrame()).toContain('not MCP call counts')
    expect(setup.renderer.root.findDescendantById('navigator.execute.message:execute')).toBe(original)
    setRuns([
      {
        ...runs()[0],
        status: 'completed',
        input: { code: 'tools.alpha.lookup(); tools.beta.search(); tools[name].dynamic()' },
      },
    ])
    await setup.flush()
    const frame = setup.captureCharFrame()

    expect(frame).toContain('alpha > lookup')
    expect(frame).toContain('beta > search')
    expect(frame).toContain('In code')
    expect(frame).toContain('Some references unresolved')
    expect(frame.match(/completed/gu)).toHaveLength(1)
    expect(frame.match(/1\.2s/gu)).toHaveLength(1)
    expect(setup.renderer.root.findDescendantById('navigator.execute.message:execute')).toBe(original)
    setup.renderer.resize(26, 24)
    await setup.flush()
    const summary = setup
      .captureCharFrame()
      .split('\n')
      .find((line) => line.includes('completed'))

    expect(summary).toContain('1.2s')
    expect(summary).not.toContain('...')
  } finally {
    abort.abort()
    for (const cleanup of cleanups) void cleanup()

    setup.renderer.destroy()
  }
})

test('TUI routing labels keep the action width and following indicator stable', async () => {
  const [mode, setMode] = createSignal<'code' | 'direct' | 'unknown'>('code')
  const color = RGBA.fromHex('#bbbbbb')
  const api = {
    theme: { current: { text: color, textMuted: color, accent: color, backgroundElement: RGBA.fromHex('#222222') } },
    ui: { dialog: {} },
  } as unknown as TuiPluginApi
  const model = { supported: true, routing: () => ({ mode: mode(), explicit: true }) } as unknown as CodeModeController
  const setup = await testRender(
    () => (
      <TuiCodeModeContext.Provider value={model}>
        <box flexDirection="row">
          <McpRoutingControl
            api={api}
            id="synthetic.routing"
            server="synthetic"
            position={{ section: 0, row: 0, column: 0 }}
          />
          <text id="synthetic.anchor">status</text>
        </box>
      </TuiCodeModeContext.Provider>
    ),
    { width: 40, height: 3 },
  )

  try {
    await setup.renderOnce()
    const action = setup.renderer.root.findDescendantById('synthetic.routing')!
    const anchor = setup.renderer.root.findDescendantById('synthetic.anchor')!
    const baseline = { width: action.width, x: anchor.x }

    for (const value of ['direct', 'unknown', 'code'] as const) {
      setMode(value)
      await setup.renderOnce()
      expect({ width: action.width, x: anchor.x }).toEqual(baseline)
    }
  } finally {
    setup.renderer.destroy()
  }
})
