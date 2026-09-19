/** @jsxImportSource @opentui/solid */
import { RGBA } from '@opentui/core'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { type JSX, Show, createSignal } from 'solid-js'

import { LspSection, McpSection, SubagentSection } from '../src/components/sections'
import { McpPersistence } from '../src/components/sidebar'
import { IconProvider } from '../src/icons/context'
import { uiIcon } from '../src/icons/ui'

import type { McpController } from '../src/controllers/mcp'
import type { PreferencesController } from '../src/controllers/preferences'
import type { SubagentController } from '../src/controllers/subagents'
import type { TuiPluginApi, TuiSidebarLspItem } from '@opencode-ai/plugin/tui'

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

    const column = lines[row].indexOf(uiIcon('mcpFavoriteEmpty'))

    await setup.mockMouse.moveTo(column, row)
    await setup.flush()
    const buffer = setup.renderer.currentRenderBuffer
    const offset = (row * buffer.width + column) * 4

    expect(new RGBA(buffer.buffers.bg.slice(offset, offset + 4)).equals(RGBA.fromHex(theme.primary))).toBe(true)
    await setup.mockMouse.click(column, row)
    await setup.flush()
    const frame = setup.captureCharFrame()

    expect(frame.indexOf('zebra'), frame).toBeLessThan(frame.indexOf('alpha'))
    expect(frame).toContain(uiIcon('mcpFavorite'))
    expect(toggles).toBe(0)
  } finally {
    setup.renderer.destroy()
  }
})

test('LSP sorts errors first and exposes live status and root for custom servers', async () => {
  const [servers, setServers] = createSignal<TuiSidebarLspItem[]>([
    { id: 'a-custom', root: '/workspace/a', status: 'connected' },
    { id: 'z-custom', root: '/workspace/z', status: 'error' },
  ])
  const [modal, setModal] = createSignal<() => JSX.Element>()
  const api = {
    theme: { current: theme },
    route: { current: { name: 'home' } },
    state: { path: { directory: '/workspace' }, lsp: servers, config: {} },
    keymap: { registerLayer: () => () => {} },
    ui: {
      dialog: {
        replace: (render: () => JSX.Element) => setModal(() => render),
        setSize() {},
        clear: () => setModal(undefined),
      },
    },
  } as unknown as TuiPluginApi
  const preferences = {
    expanded: () => ({ lsp: true }),
    toggleSectionExpanded() {},
  } as unknown as PreferencesController
  const setup = await testRender(
    () => (
      <box>
        <IconProvider style={() => 'text'}>
          <LspSection api={api} preferences={preferences} />
        </IconProvider>
        <Show when={modal()}>{(render) => render()()}</Show>
      </box>
    ),
    { width: 65, height: 22 },
  )

  try {
    await setup.flush()
    const frame = setup.captureCharFrame()

    expect(frame.indexOf('z-custom')).toBeLessThan(frame.indexOf('a-custom'))
    const lines = frame.split('\n')
    const row = lines.findIndex((line) => line.includes('z-custom'))

    await setup.mockMouse.pressDown(lines[row].indexOf('z-custom'), row)
    expect(modal()).toBeUndefined()
    await setup.mockMouse.release(lines[row].indexOf('z-custom'), row)
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Root: /workspace/z')
    expect(setup.captureCharFrame()).toContain('Connection error')
    setServers([])
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Status: not reported')
    expect(setup.captureCharFrame()).toContain('Activates as files are read')
  } finally {
    setup.renderer.destroy()
  }
})

test('Subagent filters combine with text search, reset per target, and open the parent', async () => {
  const [sessionID, setSessionID] = createSignal('child')
  const opened: string[] = []
  const api = {
    theme: { current: theme },
    state: { session: { get: () => ({ parentID: 'root' }) } },
  } as unknown as TuiPluginApi
  const controller = {
    target: (id: string) => ({ key: id }),
    list: () => [{ session: { id: 'worker', title: 'Working' }, status: { type: 'busy' } }],
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
    await click('Errors')
    expect(setup.captureCharFrame()).toContain('No matching subagents')
    await click('Parent session')
    expect(opened).toEqual(['root'])
    await click('Filter subagents')
    await setup.mockInput.typeText('nothing')
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
      expect(collapsed[0]).toMatch(/…|\.\.\./)
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
      expect(lines[bulk + 1]).toContain('Filter MCP')
    } finally {
      setup.renderer.destroy()
    }
  }
})
