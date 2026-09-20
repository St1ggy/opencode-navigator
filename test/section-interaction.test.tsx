/** @jsxImportSource @opentui/solid */
import { RGBA } from '@opentui/core'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { batch, createSignal } from 'solid-js'

import {
  FirstRunWizard,
  LspBadge,
  McpSection,
  Section,
  SettingsDialog,
  SidebarToggleBinding,
  SkillsSection,
  openSettings,
  // @ts-expect-error The package intentionally publishes JavaScript without declarations.
} from '../dist/tui.js'
import { LspSection, QuickActionsSection, SubagentSection, TodoSection } from '../src/components/sections'
import { pluginConfig } from '../src/config'
import { createPreferencesController } from '../src/controllers/preferences'
import { McpPresetMenu } from '../src/dialogs/mcp-presets'
import { IconProvider } from '../src/icons/context'
import { keyHint, sectionIcon, settingsTabIcon, uiIcon } from '../src/icons/ui'

import type { PreferencesController } from '../src/controllers/preferences'
import type { SubagentController } from '../src/controllers/subagents'
import type { TodoController } from '../src/controllers/todo'
import type { SubagentViewItem } from '../src/subagent-view'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

const sidebarTheme = {
  accent: '#ff9e64',
  text: '#c0caf5',
  textMuted: '#a9b1d6',
  backgroundPanel: '#16161e',
  backgroundElement: '#292e42',
  borderSubtle: '#3b4261',
  success: '#9ece6a',
  error: '#f7768e',
  warning: '#e0af68',
}

const expandedLayout = {
  todo: false,
  subagents: false,
  skills: true,
  quick_actions: false,
  lsp: false,
  mcp: true,
}

test('Subagents show observed duration, retry, errors and recent under one limit', async () => {
  const startedAt = Date.now() - 123_000
  const child: SubagentViewItem = {
    session: { id: 'child', title: 'Worker' } as SubagentViewItem['session'],
    status: { type: 'retry', attempt: 2, next: Date.now() - 1, message: 'network' },
    run: { sessionID: 'child', startedAt, startedBeforeObservation: true },
  }
  const [active, setActive] = createSignal([child])
  const [recent, setRecent] = createSignal<SubagentViewItem[]>([
    {
      ...child,
      session: { ...child.session, id: 'older', title: 'Earlier worker' },
      status: { type: 'idle' },
      run: {
        ...child.run!,
        sessionID: 'older',
        finishedAt: startedAt + 12_000,
        outcome: 'cancelled',
        errorMessage: 'aborted',
      },
    },
  ])
  const opened: string[] = []
  const api = { theme: { current: sidebarTheme } } as unknown as TuiPluginApi
  const controller = {
    list: active,
    recent,
    state: () => ({ status: 'ready' }),
    refresh: async () => {},
    open: (id: string) => opened.push(id),
  } as unknown as SubagentController
  const preferences = {
    expanded: () => ({ ...expandedLayout, subagents: true }),
    sectionItemLimit: () => 1,
    toggleSectionExpanded() {},
  } as unknown as PreferencesController
  const setup = await testRender(
    () => <SubagentSection api={api} controller={controller} preferences={preferences} sessionID="parent" />,
    { width: 50, height: 20 },
  )

  try {
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('≥2m 03s')
    expect(setup.captureCharFrame()).toContain('Retry #2 · 0s')
    expect(setup.captureCharFrame()).not.toContain('Earlier worker')
    let lines = setup.captureCharFrame().split('\n')
    const more = lines.findIndex((line) => line.includes('Show all'))

    await setup.mockMouse.click(lines[more].indexOf('Show all'), more)
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Recent')
    expect(setup.captureCharFrame()).toContain('Cancelled: aborted')
    lines = setup.captureCharFrame().split('\n')
    const older = lines.findIndex((line) => line.includes('Earlier worker'))

    await setup.mockMouse.click(lines[older].indexOf('Earlier worker'), older)
    expect(opened).toEqual(['older'])
    batch(() => {
      setActive([])
      setRecent([
        {
          ...child,
          status: { type: 'idle' },
          run: { ...child.run!, finishedAt: startedAt + 123_000, outcome: 'error', errorMessage: 'failed' },
        },
      ])
    })
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('0 active · 1 recent')
    expect(setup.captureCharFrame()).toContain('Error: failed')
    expect(setup.captureCharFrame()).not.toContain('No subagents')
  } finally {
    setup.renderer.destroy()
  }
})

test('Todo filters compose with limits, live updates, and session changes', async () => {
  const [sessionID, setSessionID] = createSignal('one')
  const [items, setItems] = createSignal([
    { content: 'pending-task', status: 'pending' },
    { content: 'done-task', status: 'completed' },
    { content: 'running-task', status: 'in_progress' },
    { content: 'cancelled-task', status: 'cancelled' },
  ])
  const api = { theme: { current: sidebarTheme } } as unknown as TuiPluginApi
  const controller = {
    list: items,
    target: (id: string) => ({ key: id }),
    state: () => ({ status: 'ready' }),
    refresh: async () => items(),
  } as unknown as TodoController
  const preferences = {
    expanded: () => ({ ...expandedLayout, todo: true }),
    sectionItemLimit: () => 1,
    toggleSectionExpanded() {},
  } as unknown as PreferencesController
  const setup = await testRender(
    () => <TodoSection api={api} controller={controller} preferences={preferences} sessionID={sessionID()} />,
    { width: 50, height: 22 },
  )

  async function click(label: string) {
    const lines = setup.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes(label))

    await setup.mockMouse.click(lines[row].indexOf(label), row)
    await setup.flush()
  }
  function expectTabStyle(label: string, foreground: string, background: string) {
    const lines = setup.captureCharFrame().split('\n')
    const y = lines.findIndex((line) => line.includes(label))
    const x = lines[y].indexOf(label)
    const buffer = setup.renderer.currentRenderBuffer
    const offset = (y * buffer.width + x) * 4

    expect(new RGBA(buffer.buffers.fg.slice(offset, offset + 4)).equals(RGBA.fromHex(foreground))).toBe(true)
    expect(new RGBA(buffer.buffers.bg.slice(offset, offset + 4)).equals(RGBA.fromHex(background))).toBe(true)
  }
  try {
    await setup.flush()
    expectTabStyle('All 4', sidebarTheme.accent, sidebarTheme.backgroundElement)
    expect(setup.captureCharFrame()).toContain('running-task')
    expect(setup.captureCharFrame()).not.toContain('pending-task')
    await click('Finished 2')
    expectTabStyle('Finished 2', sidebarTheme.accent, sidebarTheme.backgroundElement)
    expect(setup.captureCharFrame()).toContain('done-task')
    expect(setup.captureCharFrame()).not.toContain('Cancelled')
    await click('Show all')
    expect(setup.captureCharFrame()).toContain('Cancelled')
    expect(setup.captureCharFrame()).toContain('cancelled-task')
    await click('Active 2')
    expect(setup.captureCharFrame()).not.toContain('done-task')
    setItems([{ content: 'done-task', status: 'completed' }])
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('No active tasks')
    setSessionID('two')
    await setup.flush()
    expect(setup.captureCharFrame()).toContain(`${uiIcon('radioOn')} All 1`)
    expect(setup.captureCharFrame()).toContain('done-task')
  } finally {
    setup.renderer.destroy()
  }
})

test('LSP and Quick Actions respect per-section limits and show all', async () => {
  const api = {
    theme: { current: sidebarTheme },
    route: { current: { name: 'home' } },
    state: {
      path: { directory: '/repo' },
      config: { lsp: true },
      lsp: () => [
        { id: 'typescript', root: '/repo', status: 'connected' },
        { id: 'python', root: '/repo', status: 'connected' },
      ],
    },
    keymap: { getCommandBindings: () => new Map() },
    keys: { formatBindings: () => '' },
  } as unknown as TuiPluginApi
  const preferences = {
    expanded: () => ({ ...expandedLayout, lsp: true, quick_actions: true }),
    sectionItemLimit: () => 1,
    toggleSectionExpanded() {},
  } as unknown as PreferencesController

  for (const component of [
    () => (
      <IconProvider style={() => 'text'}>
        <LspSection api={api} preferences={preferences} />
      </IconProvider>
    ),
    () => <QuickActionsSection api={api} preferences={preferences} />,
  ]) {
    const setup = await testRender(component, { width: 50, height: 14 })

    try {
      await setup.renderOnce()
      const lines = setup.captureCharFrame().split('\n')
      const line = lines.findIndex((value) => value.includes('Show all'))

      expect(line, setup.captureCharFrame()).toBeGreaterThan(0)
      await setup.mockMouse.click(lines[line].indexOf('Show all'), line)
      await setup.renderOnce()
      expect(setup.captureCharFrame()).toContain('Show less')
      expect(setup.captureCharFrame()).toMatch(/python|Compact/)
    } finally {
      setup.renderer.destroy()
    }
  }
})

test('the built sidebar remains reactive and toggles on mouse down', async () => {
  const api = {
    theme: {
      current: {
        accent: '#ff9e64',
        text: '#c0caf5',
        textMuted: '#a9b1d6',
      },
    },
  } as unknown as TuiPluginApi

  function TestSection() {
    const [open, setOpen] = createSignal(false)

    return (
      <Section api={api} title="SKILLS" summary="3" open={open()} onToggle={() => setOpen((value) => !value)}>
        <text>content</text>
      </Section>
    )
  }

  const setup = await testRender(() => <TestSection />, { width: 30, height: 3 })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain('content')
    await setup.mockMouse.pressDown(1, 0)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain('content')
  } finally {
    setup.renderer.destroy()
  }
})

test('the built LSP badge toggles its server name on mouse down', async () => {
  const api = {
    theme: {
      current: {
        success: '#9ece6a',
        error: '#f7768e',
        textMuted: '#a9b1d6',
      },
    },
  } as unknown as TuiPluginApi
  const setup = await testRender(() => <LspBadge api={api} id="typescript" status="connected" iconStyle="text" />, {
    width: 30,
    height: 1,
  })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain('typescript')
    await setup.mockMouse.pressDown(0, 0)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain('TS typescript')
    await setup.mockMouse.pressDown(0, 0)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain('typescript')
  } finally {
    setup.renderer.destroy()
  }
})

test('the built first-run wizard explains controls and changes section settings', async () => {
  const [sections, setSections] = createSignal({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })
  let layer: { commands: { name: string; run: () => void }[] } | undefined
  const api = {
    theme: {
      current: {
        accent: '#ff9e64',
        text: '#c0caf5',
        textMuted: '#a9b1d6',
        backgroundElement: '#292e42',
        primary: '#7aa2f7',
        selectedListItemText: '#16161e',
      },
    },
    keymap: {
      registerLayer: (value: typeof layer) => {
        layer = value

        return () => {}
      },
    },
    ui: { dialog: { clear: () => {} } },
  } as unknown as TuiPluginApi
  const preferences = {
    sections,
    toggleKey: () => 'ctrl+shift+b',
    focusKey: () => 'ctrl+shift+f',
    lspIconStyle: () => 'nerd',
    toggleSection(name: keyof ReturnType<typeof sections>) {
      setSections((value) => ({ ...value, [name]: !value[name] }))
    },
  }
  const setup = await testRender(() => <FirstRunWizard api={api} preferences={preferences} />, {
    width: 80,
    height: 18,
  })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain('Welcome to OpenCode Navigator')
    expect(setup.captureCharFrame()).toContain('Toggle: ctrl+shift+b')
    expect(setup.captureCharFrame()).toContain('Focus: ctrl+shift+f')
    expect(setup.captureCharFrame()).toContain('Icons: Nerd Font')
    layer?.commands.find((command) => command.name.endsWith('.wizard.select'))?.run()
    await setup.renderOnce()
    expect(sections().todo).toBe(false)
    expect(setup.captureCharFrame()).toContain(`${uiIcon('unchecked')} ${sectionIcon('todo')} Todo`)
  } finally {
    setup.renderer.destroy()
  }
})

test('the built Skills section filters by name and description', async () => {
  const items = [
    { name: 'review-code', description: 'Review pending changes', location: '/skills/review', content: '' },
    { name: 'commit', description: 'Create commits', location: '/skills/commit', content: '' },
  ]
  const api = {
    theme: { current: sidebarTheme },
    kv: { get: () => true, set: () => {} },
    ui: { dialog: { replace: () => {} }, toast: () => {} },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test', routing: { directory: '/test' } }),
    list: () => items,
    error: () => {},
    state: () => ({ status: 'ready' }),
    refresh: async () => items,
    retry: async () => items,
    use: async () => {},
  }
  const preferences = {
    expanded: () => expandedLayout,
    toggleSectionExpanded: () => {},
    shouldConfirmSkill: () => false,
    skipSkillConfirmation: () => {},
  }
  const setup = await testRender(() => <SkillsSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 8,
  })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain('review-code')
    expect(setup.captureCharFrame()).toContain('commit')

    const filterLine = setup
      .captureCharFrame()
      .split('\n')
      .findIndex((line) => line.includes('Filter skills'))

    await setup.mockMouse.pressDown(8, filterLine)
    await setup.mockInput.typeText('pending')
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain('review-code')
    expect(setup.captureCharFrame()).not.toContain('commit')
  } finally {
    setup.renderer.destroy()
  }
})

test('the built Skills section keeps favorites first and toggles them independently', async () => {
  const items = [
    { name: 'commit', description: 'Create commits', location: '/skills/commit', content: '' },
    { name: 'review-code', description: 'Review changes', location: '/skills/review', content: '' },
  ]
  const [favorites, setFavorites] = createSignal(new Set(['/skills/review']))
  const api = {
    theme: { current: sidebarTheme },
    ui: { dialog: { replace: () => {} }, toast: () => {} },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test', routing: { directory: '/test' } }),
    list: () => items,
    state: () => ({ status: 'ready' }),
    refresh: async () => items,
    retry: async () => items,
    use: async () => {},
  }
  const preferences = {
    expanded: () => expandedLayout,
    toggleSectionExpanded: () => {},
    shouldConfirmSkill: () => false,
    favoriteSkills: favorites,
    isFavoriteSkill: (item: (typeof items)[number]) => favorites().has(item.location),
    toggleFavoriteSkill: (item: (typeof items)[number]) => {
      const next = new Set(favorites())

      if (next.has(item.location)) next.delete(item.location)
      else next.add(item.location)

      setFavorites(next)
    },
  }
  const setup = await testRender(() => <SkillsSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 8,
  })

  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame.indexOf('review-code')).toBeLessThan(frame.indexOf('commit'))
    const lines = frame.split('\n')
    const reviewLine = lines.findIndex((line) => line.includes('review-code'))

    expect(lines[reviewLine + 1].trim()).toBe('')
    expect(lines[reviewLine + 2]).toContain('commit')
    await setup.mockMouse.click(lines[reviewLine].indexOf(uiIcon('favorite')), reviewLine)
    await setup.renderOnce()
    expect(favorites().has('/skills/review'), setup.captureCharFrame()).toBe(false)
    expect(setup.captureCharFrame().indexOf('commit')).toBeLessThan(setup.captureCharFrame().indexOf('review-code'))
    const updatedLines = setup.captureCharFrame().split('\n')
    const commitLine = updatedLines.findIndex((line) => line.includes('commit'))

    expect(updatedLines[commitLine + 1]).toContain('review-code')
  } finally {
    setup.renderer.destroy()
  }
})

test('the built MCP section filters servers by name', async () => {
  const items = [
    { name: 'context7', status: 'connected' },
    { name: 'tracker', status: 'connected' },
  ]
  const api = {
    theme: { current: sidebarTheme },
    kv: { get: () => true, set: () => {} },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test', scope: '/test', routing: { directory: '/test' } }),
    list: () => items,
    state: () => ({ status: 'ready' }),
    retry: async () => items,
    serverState: () => ({ status: 'ready' }),
    retryServer: async () => {},
    mutating: () => false,
    toggle: async () => {},
  }
  const preferences = { expanded: () => expandedLayout, toggleSectionExpanded: () => {} }
  const setup = await testRender(() => <McpSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 8,
  })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain('context7')
    expect(setup.captureCharFrame()).toContain('tracker')

    const filterLine = setup
      .captureCharFrame()
      .split('\n')
      .findIndex((line) => line.includes('Filter MCP'))

    await setup.mockMouse.pressDown(8, filterLine)
    await setup.mockInput.typeText('track')
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain('context7')
    expect(setup.captureCharFrame()).toContain('tracker')
  } finally {
    setup.renderer.destroy()
  }
})

test('the built MCP section opens its preset selector from the header', async () => {
  let opened = 0
  let toggled = 0
  const [selectedPreset, setSelectedPreset] = createSignal<string | undefined>('Work')
  const [status, setStatus] = createSignal('connected')
  const api = {
    theme: { current: sidebarTheme },
    ui: {
      dialog: { replace: () => opened++, setSize: () => {} },
      toast: () => {},
    },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test', scope: '/test', routing: { directory: '/test' } }),
    list: () => [{ name: 'wiki', status: status() }],
    state: () => ({ status: 'ready' }),
    retry: async () => {},
    serverState: () => ({ status: 'ready' }),
    retryServer: async () => {},
    toggle: async () => {},
    selectedPreset,
  }
  const preferences = {
    expanded: () => ({ ...expandedLayout, mcp: false }),
    toggleSectionExpanded: () => toggled++,
    mcpPresets: () => ({ Work: { wiki: 'enabled' } }),
  }
  const setup = await testRender(() => <McpSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 3,
  })

  try {
    await setup.renderOnce()
    const line = setup.captureCharFrame().split('\n', 1)[0]

    expect(line).toContain('Preset: Work')
    await setup.mockMouse.pressDown(line.indexOf('Work'), 0)
    expect(opened).toBe(0)
    expect(toggled).toBe(0)
    await setup.mockMouse.release(line.indexOf('Work'), 0)
    expect(opened).toBe(1)
    expect(toggled).toBe(0)
    setSelectedPreset(undefined)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain('Preset: Work')
    setStatus('disabled')
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain('Preset: Work')
    expect(setup.captureCharFrame()).toContain('Preset')
  } finally {
    setup.renderer.destroy()
  }
})

test('MCP preset menu displays titles above subtitles and supports keyboard and mouse', async () => {
  let layer: { commands: { name: string; run: () => void }[] } | undefined
  let isCleaned = false
  const selected: string[] = []
  const api = {
    theme: { current: sidebarTheme },
    keymap: {
      registerLayer: (value: typeof layer) => {
        layer = value

        return () => {
          isCleaned = true
        }
      },
    },
    ui: { dialog: { clear: () => {} } },
  } as unknown as TuiPluginApi
  const options = [
    { title: 'Save current', description: 'Create a preset from the current server states', value: 'save' },
    { title: 'Work', description: '2/3 enabled', value: 'work' },
  ]
  const setup = await testRender(
    () => (
      <McpPresetMenu
        api={api}
        title="MCP presets"
        options={options}
        onSelect={(option) => selected.push(option.value)}
      />
    ),
    { width: 60, height: 12 },
  )

  try {
    await setup.renderOnce()
    const lines = setup.captureCharFrame().split('\n')
    const saveLine = lines.findIndex((line) => line.includes('Save current'))

    expect(lines[saveLine + 1]).toContain(options[0].description)
    expect(setup.captureCharFrame()).not.toContain('…')
    layer?.commands.find((command) => command.name.endsWith('.next'))?.run()
    layer?.commands.find((command) => command.name.endsWith('.select'))?.run()
    expect(selected).toEqual(['work'])
    await setup.mockMouse.click(lines[saveLine].indexOf('Save current'), saveLine)
    expect(selected).toEqual(['work', 'save'])
  } finally {
    setup.renderer.destroy()
  }
  expect(isCleaned).toBe(true)
})

test('the built Skills section keeps cached rows visible with an inline retry', async () => {
  let retries = 0
  const items = [{ name: 'cached-skill', description: 'Cached', location: '/skills/cached', content: '' }]
  const api = {
    theme: { current: sidebarTheme },
    ui: { dialog: { replace: () => {} }, toast: () => {} },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test', routing: { directory: '/test' } }),
    list: () => items,
    error: () => 'skills unavailable',
    state: () => ({
      status: 'error',
      error: { operation: 'refresh skills', target: 'test', message: 'skills unavailable', retryable: true },
    }),
    refresh: async () => items,
    retry: async () => {
      retries++

      return items
    },
    use: async () => {},
  }
  const preferences = {
    expanded: () => expandedLayout,
    toggleSectionExpanded: () => {},
    shouldConfirmSkill: () => false,
    skipSkillConfirmation: () => {},
  }
  const setup = await testRender(() => <SkillsSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 8,
  })

  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame).toContain('skills unavailable')
    expect(frame).toContain('Retry')
    expect(frame).toContain('cached-skill')

    const lines = frame.split('\n')
    const retryRow = lines.findIndex((line) => line.includes('Retry'))

    await setup.mockMouse.pressDown(lines[retryRow].indexOf('Retry'), retryRow)
    expect(retries).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
})

test('the built MCP section shows cached servers with an inline refresh retry', async () => {
  let retries = 0
  const items = [{ name: 'cached-mcp', status: 'connected' }]
  const api = {
    theme: { current: sidebarTheme },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test', scope: '/test', routing: { directory: '/test' } }),
    list: () => items,
    state: () => ({
      status: 'error',
      error: { operation: 'refresh MCP servers', target: 'test', message: 'MCP unavailable', retryable: true },
    }),
    retry: async () => {
      retries++

      return items
    },
    serverState: () => ({ status: 'ready' }),
    retryServer: async () => {},
    mutating: () => false,
    toggle: async () => {},
  }
  const preferences = { expanded: () => expandedLayout, toggleSectionExpanded: () => {} }
  const setup = await testRender(() => <McpSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 7,
  })

  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()

    expect(frame).toContain('MCP unavailable')
    expect(frame).toContain('Retry')
    expect(frame).toContain('cached-mcp')

    const lines = frame.split('\n')
    const retryRow = lines.findIndex((line) => line.includes('Retry'))

    await setup.mockMouse.pressDown(lines[retryRow].indexOf('Retry'), retryRow)
    expect(retries).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
})

test('the built settings dialog saves the current layout as default', async () => {
  const [sections] = createSignal({
    todo: true,
    subagents: false,
    skills: true,
    quick_actions: true,
    lsp: false,
    mcp: true,
  })
  let layer:
    | {
        commands: { name: string; run: () => void }[]
        bindings: { key: string; cmd: string }[]
      }
    | undefined
  let saved = 0
  let mcpToggles = 0
  let iconToggles = 0
  let prompt: { onConfirm: (value: string) => void } | undefined
  let replacement: (() => unknown) | undefined
  const savedPresets: string[] = []
  const sectionMoves: [string, number][] = []
  let updatedPresets = 0
  const api = {
    theme: { current: sidebarTheme },
    keymap: {
      registerLayer: (value: typeof layer) => {
        layer = value

        return () => {}
      },
    },
    ui: {
      DialogPrompt: (props: { onConfirm: (value: string) => void }) => {
        prompt = props

        return null
      },
      dialog: {
        clear: () => {},
        replace: (value: () => unknown) => {
          replacement = value
        },
        setSize: () => {},
      },
      toast: () => {},
    },
  } as unknown as TuiPluginApi
  const preferences = {
    sections,
    expanded: () => expandedLayout,
    sectionOrder: () => ['todo', 'subagents', 'skills', 'quick_actions', 'lsp', 'mcp'],
    selectedSections: sections,
    selectedExpanded: () => expandedLayout,
    selectedSectionOrder: () => ['todo', 'subagents', 'skills', 'quick_actions', 'lsp', 'mcp'],
    layoutPresets: () => ({
      Focus: {
        sections: sections(),
        expanded: expandedLayout,
        order: ['todo', 'subagents', 'skills', 'quick_actions', 'lsp', 'mcp'],
      },
    }),
    preferenceScope: () => 'global',
    preferenceScopeLabel: () => 'Global',
    canUseWorktreeScope: () => false,
    setPreferenceScope: () => {},
    persistMcp: () => true,
    selectedPersistMcp: () => true,
    lspIconStyle: () => 'nerd',
    selectedLspIconStyle: () => 'nerd',
    toggleKey: () => 'ctrl+shift+b',
    selectedToggleKey: () => 'ctrl+shift+b',
    focusKey: () => 'ctrl+shift+f',
    selectedFocusKey: () => 'ctrl+shift+f',
    selectedSectionItemLimit: () => 0,
    setSectionItemLimit: (_section: string, value: number) => {
      expect(value).toBe(5)
    },
    skippedSkillCount: () => 0,
    toggleSection: () => {},
    toggleSelectedSection: () => {},
    toggleMcpPersistence: () => mcpToggles++,
    toggleLspIconStyle: () => iconToggles++,
    setToggleKey: () => {},
    setFocusKey: () => {},
    resetSections: () => {},
    resetPluginSettings: () => {},
    resetMcpStates: () => {},
    resetSkillConfirmations: () => {},
    moveSection: () => {},
    moveSelectedSection: (name: string, direction: number) => sectionMoves.push([name, direction]),
    applyLayoutPreset: () => {},
    saveLayoutPreset: (name: string) => {
      savedPresets.push(name)

      return name
    },
    updateLayoutPreset: () => {
      updatedPresets++

      return true
    },
    renameLayoutPreset: (_current: string, name: string) => name,
    deleteLayoutPreset: () => true,
    saveLayoutAsDefault: async () => {
      saved++
    },
  }
  const setup = await testRender(() => <SettingsDialog api={api} preferences={preferences} />, {
    width: 100,
    height: 30,
  })

  try {
    await setup.flush()
    const initialFrame = setup.captureCharFrame()

    expect(initialFrame).toContain('Navigator settings')
    expect(initialFrame).toContain('Scope')
    expect(initialFrame).toContain('Presets')
    expect(initialFrame).toContain('Sections')
    expect(initialFrame).toContain(`${settingsTabIcon('sections')} Sections`)
    expect(initialFrame).toContain(`${settingsTabIcon('scope')} Scope`)
    expect(initialFrame).toContain(`${settingsTabIcon('presets')} Presets`)
    expect(initialFrame).toContain(`${settingsTabIcon('behavior')} Behavior`)
    expect(initialFrame).toContain(`${settingsTabIcon('defaults')} Defaults`)
    expect(initialFrame).toContain(`1. ${sectionIcon('todo')} Todo`)
    expect(initialFrame).not.toContain('Lists')
    expect(initialFrame).toContain('Items: All')
    expect(initialFrame).toContain('Behavior')
    expect(initialFrame).toContain('Defaults')
    expect(initialFrame).toContain('Todo')
    expect(initialFrame).not.toContain('Global')
    expect(initialFrame).not.toContain('Focus')
    expect(initialFrame).not.toContain('Save as…')
    expect(initialFrame).toContain(`${keyHint('tab')} switch · ${keyHint('up/down')} navigate`)
    expect(initialFrame).toContain(`${keyHint('shift+up/down')} reorder`)
    expect(initialFrame).not.toContain('Save current layout as default')
    expect(initialFrame.trimEnd().split('\n').length).toBeLessThanOrEqual(23)

    const next = layer?.commands.find((command) => command.name.endsWith('.settings.next'))
    const nextTab = layer?.commands.find((command) => command.name.endsWith('.settings.next-tab'))
    const select = layer?.commands.find((command) => command.name.endsWith('.settings.select'))

    layer?.commands.find((command) => command.name.endsWith('.settings.move-down'))?.run()
    expect(sectionMoves).toEqual([['todo', 1]])
    expect(layer?.bindings.filter((binding) => binding.key === 'left' || binding.key === 'right')).toHaveLength(2)
    expect(layer?.bindings.filter((binding) => binding.key === 'tab' || binding.key === 'shift+tab')).toHaveLength(2)
    await setup.flush()

    expect(setup.captureCharFrame()).toContain('l item limit')
    layer?.commands.find((command) => command.name.endsWith('.settings.item-limit'))?.run()
    replacement?.()
    prompt?.onConfirm('5')
    nextTab?.run()
    await setup.flush()
    const scopeFrame = setup.captureCharFrame()

    expect(scopeFrame).toContain('Global')
    expect(scopeFrame).toContain(`${keyHint('enter')} select`)
    expect(scopeFrame).not.toContain('reorder')
    expect(scopeFrame.trimEnd().split('\n').length).toBeLessThanOrEqual(13)
    nextTab?.run()
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Focus')
    expect(setup.captureCharFrame()).toContain('Save as…')
    expect(setup.captureCharFrame()).toContain(`${keyHint('enter')} manage`)
    expect(setup.captureCharFrame()).not.toContain('reorder')

    select?.run()
    const presetMenu = await testRender(() => replacement?.() as JSX.Element, { width: 60, height: 20 })

    try {
      await presetMenu.flush()
      for (const label of ['Preview & apply', 'Update from current', 'Rename', 'Delete']) {
        expect(presetMenu.captureCharFrame()).toContain(label)
      }
      layer?.commands.find((command) => command.name.endsWith('.next'))?.run()
      layer?.commands.find((command) => command.name.endsWith('.select'))?.run()
    } finally {
      presetMenu.renderer.destroy()
    }
    expect(updatedPresets).toBe(1)

    next?.run()
    select?.run()
    replacement?.()
    prompt?.onConfirm('Focus')
    expect(savedPresets).toEqual(['Focus'])

    nextTab?.run()
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Remember MCP states')
    expect(setup.captureCharFrame()).toContain(`${keyHint('enter')} change`)
    select?.run()
    expect(mcpToggles).toBe(1)
    next?.run()
    select?.run()
    expect(iconToggles).toBe(1)
    nextTab?.run()
    await setup.flush()
    const defaultFrame = setup.captureCharFrame()
    const saveLine = defaultFrame.split('\n').find((line) => line.includes('Save current layout as default'))

    expect(defaultFrame).toContain('Navigator settings')
    expect(defaultFrame).toContain('Defaults')
    expect(defaultFrame).toContain(`${keyHint('tab')} switch · ${keyHint('up/down')} navigate`)
    expect(defaultFrame).toContain(`${keyHint('enter')} run`)
    expect(defaultFrame).not.toContain('reorder')
    expect(defaultFrame).not.toContain('Todo')
    expect(saveLine).toContain('4 visible · 2 expanded')
    select?.run()
    await Promise.resolve()
    expect(saved).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
})

test('Sections edits limits with L and mouse without toggling visibility and restores the selected row', async () => {
  let layer: { commands: { name: string; run: () => void }[] } | undefined
  let prompt: { title: string; value: string; onConfirm: (value: string) => void; onCancel: () => void } | undefined
  const toasts: unknown[] = []
  const [view, setView] = createSignal<() => JSX.Element>(() => <box />)
  const api = {
    theme: { current: sidebarTheme },
    keymap: {
      registerLayer: (value: typeof layer) => {
        layer = value

        return () => {}
      },
    },
    ui: {
      dialog: { replace: (render: () => JSX.Element) => setView(() => render), setSize() {}, clear() {} },
      DialogPrompt: (props: NonNullable<typeof prompt>) => {
        prompt = props

        return <text>{props.title}</text>
      },
      toast: (value: unknown) => toasts.push(value),
    },
  } as unknown as TuiPluginApi

  const preferences = createPreferencesController(api, pluginConfig(undefined), {
    load: async () => ({ global: {}, worktrees: {}, user: {} }),
    update: async () => {},
    flush: async () => {},
  })

  await preferences.load()
  const setup = await testRender(() => <box>{view()()}</box>, { width: 100, height: 30 })
  const run = (suffix: string) => layer?.commands.find((command) => command.name.endsWith(`.settings.${suffix}`))?.run()

  try {
    openSettings(api, preferences)
    await setup.flush()
    run('next')
    run('item-limit')
    await setup.flush()
    expect(prompt?.title).toBe('Subagents item limit')
    prompt?.onConfirm('-2')
    await setup.flush()
    expect(toasts).toHaveLength(1)
    expect(prompt?.value).toBe('-2')
    expect(preferences.selectedSectionItemLimit('subagents')).toBe(0)
    prompt?.onConfirm('5')
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Items: 5')
    run('select')
    expect(preferences.selectedSections().subagents).toBe(false)
    const lines = setup.captureCharFrame().split('\n')
    const mcpLine = lines.findIndex((line) => line.includes(`6. ${sectionIcon('mcp')} MCP`))

    await setup.mockMouse.pressDown(lines[mcpLine].indexOf('Items:'), mcpLine)
    expect(preferences.selectedSections().mcp).toBe(true)
    await setup.mockMouse.release(lines[mcpLine].indexOf('Items:'), mcpLine)
    await setup.flush()
    expect(prompt?.title).toBe('MCP item limit')
    prompt?.onCancel()
    await setup.flush()
    run('select')
    expect(preferences.selectedSections().mcp).toBe(false)
    await setup.mockMouse.moveTo(0, 0)
    run('move-up')
    await setup.flush()
    run('item-limit')
    await setup.flush()
    expect(prompt?.title).toBe('MCP item limit')
  } finally {
    setup.renderer.destroy()
  }
})

test('the built settings dialog opens at a spacious width', () => {
  let size: string | undefined
  let render: (() => unknown) | undefined
  const api = {
    ui: {
      dialog: {
        replace: (value: () => unknown) => {
          render = value
        },
        setSize: (value: string) => {
          size = value
        },
      },
    },
  } as unknown as TuiPluginApi

  openSettings(api, {})

  expect(render).toBeDefined()
  expect(size).toBe('xlarge')
})

test('the sidebar shortcut binding follows runtime settings', async () => {
  const [shortcut, setShortcut] = createSignal('ctrl+shift+b')
  const registered: string[] = []
  const disposed: string[] = []
  const api = {
    route: { current: { name: 'session' } },
    keymap: {
      registerLayer: (layer: { bindings: { key: string }[] }) => {
        const key = layer.bindings[0].key

        registered.push(key)

        return () => disposed.push(key)
      },
      dispatchCommand: () => ({ ok: true }),
    },
  } as unknown as TuiPluginApi
  const setup = await testRender(() => <SidebarToggleBinding api={api} preferences={{ toggleKey: shortcut }} />, {
    width: 1,
    height: 1,
  })

  try {
    await setup.renderOnce()
    expect(registered).toEqual(['ctrl+shift+b'])

    setShortcut('alt+s')
    await setup.renderOnce()
    expect(registered).toEqual(['ctrl+shift+b', 'alt+s'])
    expect(disposed).toEqual(['ctrl+shift+b'])
  } finally {
    setup.renderer.destroy()
  }
  expect(disposed).toEqual(['ctrl+shift+b', 'alt+s'])
})
