/** @jsxImportSource @opentui/solid */
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

    await setup.mockMouse.click(lines[row].indexOf(uiIcon('favoriteEmpty')), row)
    await setup.flush()
    const frame = setup.captureCharFrame()

    expect(frame.indexOf('zebra'), frame).toBeLessThan(frame.indexOf('alpha'))
    expect(frame).toContain(uiIcon('favorite'))
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
