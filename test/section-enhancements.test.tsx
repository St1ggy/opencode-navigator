/** @jsxImportSource @opentui/solid */
import { RGBA } from '@opentui/core'
import { registerCommaBindings } from '@opentui/keymap/addons'
import { createTestKeymap } from '@opentui/keymap/testing'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { SettingsBinding } from '../src/features/sidebar-settings'
import { IconProvider } from '../src/icons/context'
import { uiIcon } from '../src/icons/ui'
import {
  LspSection,
  McpPersistence,
  McpSection,
  SectionFilter,
  SidebarTitle,
  SubagentSection,
} from '../src/pages/session-sidebar'

import type { McpController } from '../src/controllers/mcp'
import type { PreferencesController } from '../src/controllers/preferences'
import type { SubagentController } from '../src/controllers/subagents'
import type { SidebarInteraction } from '../src/sidebar-interaction'
import type { TuiPluginApi, TuiSidebarLspItem } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'
import type { JSX } from 'solid-js'

const theme = {
  text: '#ffffff',
  textMuted: '#888888',
  accent: '#00ffff',
  primary: '#00ffff',
  success: '#00ff00',
  error: '#ff0000',
  warning: '#ffff00',
  backgroundPanel: '#111111',
  backgroundElement: '#333333',
  selectedListItemText: '#000000',
}

test('Navigator Settings registers Ctrl+, and opens from its command', async () => {
  let layer: {
    bindings?: { key: { name: string; ctrl?: boolean }; cmd: string }[]
    commands?: { name: string; run: () => void }[]
  } = {}
  let opened = 0
  let unregistered = 0
  const api = {
    route: { current: { name: 'home' } },
    keymap: {
      registerLayer: (next: typeof layer) => {
        layer = next

        return () => unregistered++
      },
    },
    ui: {
      dialog: {
        replace: () => opened++,
        setSize() {},
        clear() {},
      },
    },
  } as unknown as TuiPluginApi
  const setup = await testRender(() => <SettingsBinding api={api} preferences={{} as PreferencesController} />, {
    width: 1,
    height: 1,
  })

  try {
    await setup.flush()
    const binding = layer.bindings?.[0]

    expect(binding).toEqual({ key: { name: ',', ctrl: true }, cmd: 'opencode-navigator.settings' })

    if (!binding) throw new Error('Settings binding was not registered')

    const harness = createTestKeymap({ defaultKeys: true })

    registerCommaBindings(harness.keymap)
    let dispatched = 0

    try {
      harness.keymap.registerLayer({
        bindings: [binding],
        commands: [
          {
            name: binding.cmd,
            run() {
              dispatched++
            },
          },
        ],
      })
      harness.host.press(',', { ctrl: true })
      expect(dispatched).toBe(1)
    } finally {
      harness.cleanup()
    }
    layer.commands?.[0].run()
    expect(opened).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
  expect(unregistered).toBe(1)
})

test('favorite-only preference updates do not replay MCP connection restoration', async () => {
  const [settings, setSettings] = createSignal({ persist: true, favorite: false })
  let activations = 0
  const api = {
    state: { ready: true },
    route: { current: { name: 'session', params: { sessionID: 'one' } } },
  } as unknown as TuiPluginApi
  const controller = {
    persist: () => settings().persist,
    target: () => ({ key: 'one' }),
    activate: async () => {
      activations++
    },
    deactivate() {},
  } as unknown as McpController
  const setup = await testRender(() => <McpPersistence api={api} controller={controller} />, { width: 10, height: 1 })

  try {
    await setup.flush()
    expect(activations).toBe(1)
    setSettings({ persist: true, favorite: true })
    await setup.flush()
    expect(activations).toBe(1)
    setSettings({ persist: false, favorite: true })
    await setup.flush()
    expect(activations).toBe(2)
  } finally {
    setup.renderer.destroy()
  }
})

test('section filters keep one empty row above and below the field', async () => {
  const api = { theme: { current: theme } } as unknown as TuiPluginApi
  const setup = await testRender(
    () => (
      <box>
        <text>Before</text>
        <SectionFilter api={api} query="" placeholder="Filter items..." onInput={() => {}} />
        <text>After</text>
      </box>
    ),
    { width: 30, height: 5 },
  )

  try {
    await setup.flush()
    const lines = setup.captureCharFrame().split('\n')

    expect(
      lines.findIndex((line) => line.includes('Filter items')) - lines.findIndex((line) => line.includes('Before')),
    ).toBe(2)
    expect(
      lines.findIndex((line) => line.includes('After')) - lines.findIndex((line) => line.includes('Filter items')),
    ).toBe(2)
  } finally {
    setup.renderer.destroy()
  }
})

test('MCP favorite toggles reorder rows without changing server state', async () => {
  const [favorites, setFavorites] = createSignal(new Set<string>())
  let toggles = 0
  const api = { theme: { current: theme } } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test' }),
    list: () => [
      { name: 'alpha', status: 'connected' },
      { name: 'zebra', status: 'disabled' },
    ],
    state: () => ({ status: 'ready' }),
    serverState: () => ({ status: 'ready' }),
    toggle: async () => {
      toggles++
    },
  } as unknown as McpController
  const preferences = {
    expanded: () => ({ mcp: true }),
    favoriteMcpServers: favorites,
    toggleFavoriteMcpServer: (name: string) =>
      setFavorites(favorites().has(name) ? new Set<string>() : new Set([name])),
  } as unknown as PreferencesController
  const setup = await testRender(() => <McpSection api={api} controller={controller} preferences={preferences} />, {
    width: 45,
    height: 14,
  })

  try {
    await setup.flush()
    const lines = setup.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes('zebra'))

    const column = Bun.stringWidth(lines[row].slice(0, lines[row].indexOf(uiIcon('bookmarkEmpty'))))

    await setup.mockMouse.moveTo(column, row)
    await setup.flush()
    const buffer = setup.renderer.currentRenderBuffer
    const offset = (row * buffer.width + column) * 4

    expect(new RGBA(buffer.buffers.bg.slice(offset, offset + 4)).equals(RGBA.fromHex(theme.primary))).toBe(true)
    await setup.mockMouse.click(column, row)
    await setup.flush()
    const frame = setup.captureCharFrame()

    expect(frame.indexOf('zebra'), frame).toBeLessThan(frame.indexOf('alpha'))
    expect(frame).toContain(uiIcon('bookmark'))
    expect(toggles).toBe(0)
  } finally {
    setup.renderer.destroy()
  }
})

test('MCP groups have a gap only between adjacent buckets', async () => {
  const api = { theme: { current: theme } } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test' }),
    list: () => [
      { name: 'alpha', status: 'connected' },
      { name: 'beta', status: 'disabled' },
      { name: 'gamma', status: 'connected' },
    ],
    state: () => ({ status: 'ready' }),
    serverState: () => ({ status: 'ready' }),
  } as unknown as McpController
  const preferences = {
    expanded: () => ({ mcp: true }),
    favoriteMcpServers: () => new Set<string>(),
    mcpServerGroups: () => ({ alpha: 'Docs', beta: 'Docs', gamma: 'Operations' }),
  } as unknown as PreferencesController
  const setup = await testRender(() => <McpSection api={api} controller={controller} preferences={preferences} />, {
    width: 45,
    height: 18,
  })

  try {
    await setup.flush()
    const lines = setup.captureCharFrame().split('\n')
    const row = (value: string) => lines.findIndex((line) => line.includes(value))

    expect(row('alpha') - row('Docs')).toBe(1)
    expect(row('beta') - row('alpha')).toBe(1)
    expect(row('Operations') - row('beta')).toBe(2)
    expect(row('gamma') - row('Operations')).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
})

test('LSP sorts errors first and toggles known server labels without opening a dialog', async () => {
  const [servers, setServers] = createSignal<TuiSidebarLspItem[]>([
    { id: 'typescript', root: '', status: 'connected' },
    { id: 'pyright', root: '', status: 'error' },
  ])
  let opened = 0
  const api = {
    theme: { current: theme },
    route: { current: { name: 'home' } },
    state: { path: { directory: '/workspace' }, lsp: servers, config: {} },
    keymap: { registerLayer: () => () => {} },
    ui: { dialog: { replace: () => opened++, setSize() {}, clear() {} } },
  } as unknown as TuiPluginApi
  const preferences = {
    expanded: () => ({ lsp: true }),
    toggleSectionExpanded() {},
  } as unknown as PreferencesController
  const setup = await testRender(
    () => (
      <IconProvider style={() => 'text'}>
        <LspSection api={api} preferences={preferences} />
      </IconProvider>
    ),
    { width: 65, height: 22 },
  )

  try {
    await setup.flush()
    const frame = setup.captureCharFrame()

    expect(frame.indexOf('Py')).toBeLessThan(frame.indexOf('TS'))
    const lines = frame.split('\n')
    const row = lines.findIndex((line) => line.includes('Py'))

    await setup.mockMouse.pressDown(lines[row].indexOf('Py'), row)
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('pyright')
    expect(setup.captureCharFrame()).not.toContain('Root:')
    expect(opened).toBe(0)
    setServers([])
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Activates as files are read')
  } finally {
    setup.renderer.destroy()
  }
})

test('Subagent filters combine with text search, reset per target, and open the parent', async () => {
  const [sessionID, setSessionID] = createSignal('child')
  const [active, setActive] = createSignal([
    { session: { id: 'worker', title: 'Working' }, status: { type: 'busy' as const } },
  ])
  const opened: string[] = []
  const api = {
    theme: { current: theme },
    state: { session: { get: () => ({ parentID: 'root' }) } },
  } as unknown as TuiPluginApi
  const controller = {
    target: (id: string) => ({ key: id }),
    list: active,
    recent: () => [
      {
        session: { id: 'done', title: 'Finished work' },
        status: { type: 'idle' },
        run: { finishedAt: Date.now(), startedAt: Date.now(), outcome: 'finished' },
      },
    ],
    state: () => ({ status: 'ready' }),
    refresh: async () => {},
    open: (id: string) => opened.push(id),
  } as unknown as SubagentController
  const preferences = {
    expanded: () => ({ subagents: true }),
    toggleSectionExpanded() {},
  } as unknown as PreferencesController
  const setup = await testRender(
    () => <SubagentSection api={api} controller={controller} preferences={preferences} sessionID={sessionID()} />,
    { width: 60, height: 25 },
  )

  async function click(label: string) {
    const lines = setup.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes(label))

    await setup.mockMouse.click(lines[row].indexOf(label), row)
    await setup.flush()
  }
  try {
    await setup.flush()
    await click('Recent')
    expect(setup.captureCharFrame()).toContain('Finished work')
    expect(setup.captureCharFrame()).not.toContain('Working')
    expect(setup.captureCharFrame()).not.toContain('Errors')
    setActive([])
    await setup.flush()
    await click('Active')
    expect(setup.captureCharFrame()).toContain('Finished work')
    await click('Parent session')
    expect(opened).toEqual(['root'])
    await click('Filter subagents')
    await setup.mockInput.typeText('nothing')
    setActive([{ session: { id: 'worker', title: 'Working' }, status: { type: 'busy' } }])
    setSessionID('other')
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Working')
    expect(setup.captureCharFrame()).toContain('Finished work')
    expect(setup.captureCharFrame()).not.toContain('nothing')
  } finally {
    setup.renderer.destroy()
  }
})

test('Subagent background refresh preserves cached rows and the empty state without flashing', async () => {
  const [status, setStatus] = createSignal<'ready' | 'refreshing'>('ready')
  const [items, setItems] = createSignal<{ session: { id: string; title: string }; status: { type: 'busy' } }[]>([])
  let activations = 0
  let refreshes = 0
  const api = { theme: { current: theme } } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'parent' }),
    list: items,
    recent: () => [],
    state: () => ({ status: status() }),
    activate: () => {
      activations++

      return () => {}
    },
    refresh: async () => {
      refreshes++
    },
  } as unknown as SubagentController
  const preferences = { expanded: () => ({ subagents: true }) } as unknown as PreferencesController
  const setup = await testRender(
    () => <SubagentSection api={api} controller={controller} preferences={preferences} sessionID="parent" />,
    { width: 37, height: 20 },
  )

  try {
    await setup.flush()
    const empty = setup.captureCharFrame()

    expect(empty).toContain('No subagents')
    setStatus('refreshing')
    await setup.flush()
    expect(setup.captureCharFrame()).toBe(empty)
    setStatus('ready')
    setItems([{ session: { id: 'worker', title: 'Working' }, status: { type: 'busy' } }])
    await setup.flush()
    const populated = setup.captureCharFrame()

    expect(populated).toContain('Working')
    for (let tick = 0; tick < 3; tick++) {
      setStatus('refreshing')
      setItems(items().map((item) => ({ ...item })))
      await setup.flush()
      expect(setup.captureCharFrame()).toBe(populated)
      setStatus('ready')
      await setup.flush()
      expect(setup.captureCharFrame()).toBe(populated)
    }
    expect(activations).toBe(1)
    expect(refreshes).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
})

test('MCP truncates long preset names and keeps expanded controls on one line', async () => {
  const preset = 'A very long workspace preset with many servers'

  for (const width of [30, 37]) {
    const [expanded, setExpanded] = createSignal(false)
    let opened = 0
    const api = {
      theme: { current: theme },
      ui: {
        dialog: {
          replace: () => {
            opened++
          },
          setSize() {},
        },
      },
    } as unknown as TuiPluginApi
    const controller = {
      target: () => ({ key: 'test' }),
      list: () => [
        { name: 'alpha', status: 'connected' },
        { name: 'beta', status: 'disabled' },
      ],
      state: () => ({ status: 'ready' }),
      serverState: () => ({ status: 'ready' }),
      selectedPreset: () => preset,
    } as unknown as McpController
    const preferences = {
      expanded: () => ({ mcp: expanded() }),
      mcpPresets: () => ({ [preset]: { alpha: 'enabled', beta: 'disabled' } }),
    } as unknown as PreferencesController
    const setup = await testRender(() => <McpSection api={api} controller={controller} preferences={preferences} />, {
      width,
      height: 15,
    })

    try {
      await setup.flush()
      const collapsed = setup.captureCharFrame().trimEnd().split('\n')

      expect(collapsed).toHaveLength(1)
      expect(collapsed[0]).toContain('MCP')
      expect(collapsed[0]).toContain('1/2')
      expect(collapsed[0]).not.toContain(preset)
      expect(collapsed[0]).not.toContain('Preset:')
      expect(collapsed[0]).toContain('A very')
      expect(collapsed[0]).not.toContain('servers')
      expect(collapsed[0]).toMatch(/…|\.\.\./)
      const action = setup.renderer.root.findDescendantById('opencode-navigator.mcp.presets') as BoxRenderable

      await setup.mockMouse.moveTo(action.screenX + 1, action.screenY)
      await setup.flush()
      const highlighted = setup.captureCharFrame().split('\n')[action.screenY]

      expect(highlighted[action.screenX]).toBe(uiIcon('selectionLeft'))
      expect(highlighted[action.screenX + action.width - 1]).toBe(uiIcon('selectionRight'))
      await setup.mockMouse.click(collapsed[0].indexOf(uiIcon('presets')), 0)
      expect(opened, collapsed[0]).toBe(1)
      setExpanded(true)
      await setup.flush()
      const lines = setup.captureCharFrame().split('\n')

      expect(lines[0]).toContain('MCP')
      expect(lines[0]).toContain('1/2')
      const bulk = lines.findIndex((line) => line.includes('Connect'))

      expect(bulk).toBeGreaterThan(0)
      expect(lines[bulk]).toContain('Disconnect')
      expect(lines[bulk + 2]).toContain('Filter MCP')
    } finally {
      setup.renderer.destroy()
    }
  }
})

test('failed MCP rows open the full error from a dedicated information control', async () => {
  const message = 'SSE error: Non-200 status code (403)\nAuthentication failed for the synthetic endpoint.'
  let modal: (() => JSX.Element) | undefined
  const api = {
    theme: { current: theme },
    keymap: { registerLayer: () => () => {} },
    ui: {
      dialog: { replace: (render: () => JSX.Element) => (modal = render), setSize() {}, clear() {} },
    },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test', scope: '/test', routing: { directory: '/test' } }),
    list: () => [{ name: 'websearch', status: 'failed', error: message }],
    state: () => ({ status: 'ready' }),
    serverState: () => ({ status: 'ready' }),
    mutating: () => false,
    toggle: async () => {},
  } as unknown as McpController
  const preferences = {
    expanded: () => ({ mcp: true }),
    favoriteMcpServers: () => new Set<string>(),
  } as unknown as PreferencesController
  const setup = await testRender(() => <McpSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 12,
  })

  try {
    await setup.flush()
    const frame = setup.captureCharFrame()
    const row = frame.split('\n').findIndex((line) => line.includes('websearch'))
    const column = frame.split('\n')[row].indexOf(uiIcon('info'))

    expect(frame).not.toContain(message)
    expect(column).toBeGreaterThan(-1)
    await setup.mockMouse.release(column, row)
    expect(modal).toBeDefined()
  } finally {
    setup.renderer.destroy()
  }

  const dialog = await testRender(() => <box paddingTop={5}>{modal!()}</box>, { width: 70, height: 25 })

  try {
    await dialog.flush()
    const frame = dialog.captureCharFrame()

    expect(frame).toContain('MCP error · websearch')
    expect(frame).toContain('websearch')
    expect(frame).toContain('failed')
    expect(frame).toContain('Authentication failed for the synthetic endpoint.')
  } finally {
    dialog.renderer.destroy()
  }
})

test('sidebar settings uses a three-cell control aligned to the title edge', async () => {
  const created = Date.UTC(2030, 0, 2, 12)
  const api = {
    theme: { current: theme },
    state: { session: { get: () => ({ time: { created, updated: created } }) } },
  } as unknown as TuiPluginApi
  const interaction = {
    setTitleRoot() {},
    ownsFocus: () => false,
    isSelected: () => false,
    register: () => () => {},
    mouseActivate: () => false,
  } as unknown as SidebarInteraction
  const preferences = {} as PreferencesController
  const setup = await testRender(
    () => (
      <IconProvider style={() => 'nerd'}>
        <SidebarTitle api={api} preferences={preferences} interaction={interaction} sessionID="one" title="Navigator" />
      </IconProvider>
    ),
    { width: 24, height: 4 },
  )

  try {
    await setup.flush()
    const control = setup.renderer.root.findDescendantById('opencode-navigator.settings') as BoxRenderable

    expect(control.width).toBe(3)
    expect(control.screenX + control.width).toBe(24)
    const frame = setup.captureCharFrame()
    const lines = frame.split('\n')
    const date = `Created ${new Date(created).toLocaleDateString('en', { dateStyle: 'medium' })}`
    const dateRow = lines.findIndex((line) => line.includes(date))
    const dateColumn = lines[dateRow].indexOf(date)
    const offset = (dateRow * setup.renderer.currentRenderBuffer.width + dateColumn) * 4

    expect(frame).not.toContain(uiIcon('idle'))
    expect(
      new RGBA(setup.renderer.currentRenderBuffer.buffers.fg.slice(offset, offset + 4)).equals(
        RGBA.fromHex(theme.textMuted),
      ),
    ).toBe(true)
    await setup.mockMouse.moveTo(control.screenX + 1, control.screenY)
    await setup.flush()
    expect(setup.captureCharFrame()).toContain(
      `${uiIcon('selectionLeft')}${uiIcon('settings')}${uiIcon('selectionRight')}`,
    )
  } finally {
    setup.renderer.destroy()
  }
})
