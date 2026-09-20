/** @jsxImportSource @opentui/solid */
import { RGBA } from '@opentui/core'
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui'
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { For, batch, createSignal, onCleanup } from 'solid-js'

import { SectionFilter, useSidebarItem } from '../src/components/common'
import { ListVisibilityControl } from '../src/components/list-visibility'
import { SubagentSection, TodoSection } from '../src/components/sections'
import { SidebarFocusBinding } from '../src/components/sidebar'
import { createListVisibility } from '../src/controllers/list-visibility'
import { type SidebarInteraction, createSidebarInteraction } from '../src/sidebar-interaction'

import type { PreferencesController } from '../src/controllers/preferences'
import type { SubagentController } from '../src/controllers/subagents'
import type { TodoController } from '../src/controllers/todo'
import type { SubagentViewItem } from '../src/subagent-view'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

const theme = {
  primary: '#7aa2f7',
  selectedListItemText: '#16161e',
  backgroundElement: '#292e42',
  backgroundPanel: '#16161e',
  text: '#c0caf5',
  textMuted: '#a9b1d6',
  accent: '#ff9e64',
  warning: '#e0af68',
  error: '#f7768e',
  success: '#9ece6a',
  info: '#7dcfff',
}

test('Todo modes activate through real sidebar keyboard navigation', async () => {
  let interaction!: SidebarInteraction

  function Harness() {
    const renderer = useRenderer()
    const api = {
      renderer,
      theme: { current: theme },
      keymap: createDefaultOpenTuiKeymap(renderer),
      route: { current: { name: 'session' } },
      ui: { dialog: { open: false } },
    } as unknown as TuiPluginApi

    interaction = createSidebarInteraction(api)
    onCleanup(() => interaction.dispose())
    const controller = {
      list: () => [{ content: 'done', status: 'completed' }],
      state: () => ({ status: 'ready' }),
      refresh: async () => [],
    } as unknown as TodoController
    const preferences = {
      expanded: () => ({ todo: true }),
      toggleSectionExpanded() {},
    } as unknown as PreferencesController

    return (
      <box ref={(node: BoxRenderable) => interaction.setContentRoot(node)} focusable>
        <TodoSection
          api={api}
          controller={controller}
          preferences={preferences}
          interaction={interaction}
          sessionID="parent"
        />
      </box>
    )
  }
  const setup = await testRender(() => <Harness />, { width: 34, height: 16 })

  try {
    await setup.flush()
    interaction.focus(null, 'opencode-navigator.todo.filter.active')
    setup.mockInput.pressEnter()
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('No active tasks')
    setup.mockInput.pressArrow('down')
    setup.mockInput.pressEnter()
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Completed')
  } finally {
    setup.renderer.destroy()
  }
})

test('Subagent ticks and active-to-recent moves preserve row identity and keyboard focus', async () => {
  const item: SubagentViewItem = {
    session: { id: 'child', title: 'Worker' } as SubagentViewItem['session'],
    status: { type: 'busy' },
    run: { sessionID: 'child', startedAt: Date.now() - 1000, startedBeforeObservation: false },
  }
  const [active, setActive] = createSignal([item])
  const [recent, setRecent] = createSignal<SubagentViewItem[]>([])
  let interaction!: SidebarInteraction
  let refreshes = 0
  const opened: string[] = []

  function Harness() {
    const renderer = useRenderer()
    const api = {
      renderer,
      theme: { current: theme },
      keymap: createDefaultOpenTuiKeymap(renderer),
      route: { current: { name: 'session' } },
      ui: { dialog: { open: false } },
    } as unknown as TuiPluginApi

    interaction = createSidebarInteraction(api)
    onCleanup(() => interaction.dispose())
    const controller = {
      list: active,
      recent,
      state: () => ({ status: 'ready' }),
      refresh: async () => {
        refreshes++
      },
      open: (id: string) => opened.push(id),
    } as unknown as SubagentController
    const preferences = {
      expanded: () => ({ subagents: true }),
      toggleSectionExpanded() {},
    } as unknown as PreferencesController

    return (
      <box ref={(node: BoxRenderable) => interaction.setContentRoot(node)} focusable>
        <SubagentSection
          api={api}
          controller={controller}
          preferences={preferences}
          interaction={interaction}
          sessionID="parent"
        />
      </box>
    )
  }
  const setup = await testRender(() => <Harness />, { width: 36, height: 14 })

  try {
    await setup.flush()
    const id = 'opencode-navigator.subagent.child'

    interaction.focus(null, id)
    const node = interaction.available().find((row) => row.id === id)?.renderable

    await Bun.sleep(1100)
    await setup.flush()
    expect(interaction.available().find((row) => row.id === id)?.renderable).toBe(node)
    expect(refreshes).toBe(1)
    batch(() => {
      setActive([])
      setRecent([
        { ...item, status: { type: 'idle' }, run: { ...item.run!, finishedAt: Date.now(), outcome: 'finished' } },
      ])
    })
    await setup.flush()
    expect(interaction.selectedId()).toBe(id)
    expect(interaction.available().find((row) => row.id === id)?.renderable).toBe(node)
    setup.mockInput.pressEnter()
    expect(opened).toEqual(['child'])
  } finally {
    setup.renderer.destroy()
  }
})

test('list footer expands with Enter, collapses with mouse, and returns focus when removed', async () => {
  let interaction!: SidebarInteraction
  const [items, setItems] = createSignal([1, 2, 3])

  function Harness() {
    const renderer = useRenderer()
    const api = {
      renderer,
      keymap: createDefaultOpenTuiKeymap(renderer),
      theme: { current: theme },
      route: { current: { name: 'session' } },
      ui: { dialog: { open: false } },
    } as unknown as TuiPluginApi

    interaction = createSidebarInteraction(api)
    onCleanup(() => interaction.dispose())
    const visibility = createListVisibility({ items, limit: () => 1, resetKey: () => 'test' })
    const heading = useSidebarItem(api, interaction, {
      id: 'opencode-navigator.section.skills',
      order: 100,
      activate() {},
    })

    return (
      <box ref={(node: BoxRenderable) => interaction.setContentRoot(node)} focusable>
        <box ref={heading.ref}>
          <text>Skills</text>
        </box>
        <For each={visibility.visible()}>{(item) => <text>skill-{item}</text>}</For>
        <ListVisibilityControl
          api={api}
          interaction={interaction}
          section="skills"
          order={100}
          visibility={visibility}
        />
      </box>
    )
  }
  const setup = await testRender(() => <Harness />, { width: 40, height: 8 })

  try {
    await setup.flush()
    interaction.focus(null, 'opencode-navigator.list.skills')
    setup.mockInput.pressEnter()
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('skill-3')
    expect(interaction.selectedId()).toBe('opencode-navigator.list.skills')
    const lines = setup.captureCharFrame().split('\n')
    const line = lines.findIndex((value) => value.includes('Show less'))

    await setup.mockMouse.click(lines[line].indexOf('Show less'), line)
    await setup.flush()
    expect(setup.captureCharFrame()).not.toContain('skill-3')
    expect(interaction.selectedId()).toBe('opencode-navigator.list.skills')
    setItems([1])
    await setup.flush()
    expect(interaction.selectedId()).toBe('opencode-navigator.section.skills')
    expect(interaction.available().some((item) => item.id === 'opencode-navigator.list.skills')).toBe(false)
  } finally {
    setup.renderer.destroy()
  }
})

test('focus shortcut registration follows runtime replacement and direct commands have no bindings', async () => {
  const [focusKey, setFocusKey] = createSignal('ctrl+shift+f')
  const layers: { bindings?: { key: string }[]; commands?: { name: string }[] }[] = []
  const disposed: string[] = []
  const api = {
    route: { current: { name: 'session' } },
    renderer: { currentFocusedRenderable: null, on: () => {}, off: () => {} },
    keymap: {
      registerLayer(layer: (typeof layers)[number]) {
        layers.push(layer)

        return () => {
          const key = layer.bindings?.[0]?.key

          if (key) disposed.push(key)
        }
      },
      dispatchCommand: () => ({ ok: true }),
    },
    ui: { dialog: { replace: () => {}, setSize: () => {} } },
  } as unknown as TuiPluginApi
  const interaction = createSidebarInteraction(api)
  const setup = await testRender(
    () => (
      <SidebarFocusBinding
        api={api}
        preferences={{ focusKey } as unknown as PreferencesController}
        interaction={interaction}
      />
    ),
    { width: 1, height: 1 },
  )

  try {
    await setup.renderOnce()
    expect(layers.flatMap((layer) => layer.bindings ?? []).map((binding) => binding.key)).toEqual(['ctrl+shift+f'])
    expect(layers[0].commands?.map((command) => command.name)).toContain('opencode-navigator.focus.skills')
    expect(layers[0].commands?.map((command) => command.name)).toContain('opencode-pretty-sidebar.focus.skills')
    expect(layers[0].bindings).toBeUndefined()

    setFocusKey('alt+f')
    await setup.renderOnce()
    expect(layers.flatMap((layer) => layer.bindings ?? []).map((binding) => binding.key)).toEqual([
      'ctrl+shift+f',
      'alt+f',
    ])
    expect(disposed).toEqual(['ctrl+shift+f'])
  } finally {
    setup.renderer.destroy()
  }
})

test('palette focus commands are disabled while a dialog is open', () => {
  const api = {
    route: { current: { name: 'session' } },
    renderer: { currentFocusedRenderable: null, on: () => {}, off: () => {} },
    keymap: { dispatchCommand: () => ({ ok: true }) },
    ui: { dialog: { open: true } },
  } as unknown as TuiPluginApi
  const interaction = createSidebarInteraction(api)

  try {
    expect(interaction.baseCommands().every((command) => !command.enabled?.())).toBe(true)
  } finally {
    interaction.dispose()
  }
})

test('real key input wraps arrows and j/k, activates, isolates other focus, and selects before mouse activation', async () => {
  let interaction!: SidebarInteraction
  let modal: BoxRenderable | undefined
  const activated: string[] = []

  function Row(props: { id: string; order: number; disabled?: boolean }) {
    const item = useSidebarItem(api, interaction, {
      id: props.id,
      order: props.order,
      disabled: () => props.disabled === true,
      activate: () => activated.push(`${props.id}:${interaction.selectedId()}`),
    })

    return (
      <box
        ref={(node: BoxRenderable) => item.ref(node)}
        id={props.id}
        height={1}
        backgroundColor={item.backgroundColor()}
        onMouseDown={(event) => item.activate(event)}
      >
        <text fg={item.foregroundColor()}>{props.id}</text>
      </box>
    )
  }

  let api!: TuiPluginApi

  function Harness() {
    const renderer = useRenderer()

    api = {
      renderer,
      keymap: createDefaultOpenTuiKeymap(renderer),
      route: { current: { name: 'session', params: { sessionID: 'session' } } },
      theme: { current: theme },
      ui: { dialog: { replace: () => {}, setSize: () => {} } },
    } as unknown as TuiPluginApi
    interaction = createSidebarInteraction(api)
    onCleanup(() => interaction.dispose())

    return (
      <box>
        <box
          ref={(node: BoxRenderable) => interaction.setContentRoot(node)}
          focusable
          onKeyDown={(event) => {
            if (event.name === 'escape' && !event.defaultPrevented) interaction.leave()
          }}
        >
          <Row id="a" order={1} />
          <Row id="b" order={2} />
          <Row id="disabled" order={3} disabled />
        </box>
        <box ref={(node: BoxRenderable) => (modal = node)} focusable>
          <text>modal</text>
        </box>
      </box>
    )
  }

  const setup = await testRender(() => <Harness />, { width: 30, height: 5 })

  try {
    await setup.flush()
    await Promise.resolve()
    interaction.focus(null)
    expect(interaction.selectedId()).toBe('a')
    setup.mockInput.pressArrow('up')
    expect(interaction.selectedId()).toBe('disabled')
    setup.mockInput.pressKey('j')
    expect(interaction.selectedId()).toBe('a')
    setup.mockInput.pressKey('k')
    expect(interaction.selectedId()).toBe('disabled')
    setup.mockInput.pressEnter()
    expect(activated).toEqual([])
    setup.mockInput.pressArrow('up')
    setup.mockInput.pressEnter()
    expect(activated).toEqual(['b:b'])

    modal?.focus()
    await setup.flush()
    expect(interaction.ownsFocus()).toBe(false)
    setup.mockInput.pressArrow('down')
    expect(interaction.selectedId()).toBe('b')

    await setup.mockMouse.pressDown(0, 0)
    expect(activated.at(-1)).toBe('a:a')
  } finally {
    setup.renderer.destroy()
  }
})

test('filter enter takes real focus, j/k type, and two escapes return then leave', async () => {
  let interaction!: SidebarInteraction
  let root: BoxRenderable | undefined
  let api!: TuiPluginApi
  const [query, setQuery] = createSignal('')

  function Harness() {
    const renderer = useRenderer()

    api = {
      renderer,
      keymap: createDefaultOpenTuiKeymap(renderer),
      route: { current: { name: 'session', params: { sessionID: 'session' } } },
      theme: { current: theme },
      ui: { dialog: { replace: () => {}, setSize: () => {} } },
    } as unknown as TuiPluginApi
    interaction = createSidebarInteraction(api)
    onCleanup(() => interaction.dispose())

    return (
      <box
        ref={(node: BoxRenderable) => {
          root = node
          interaction.setContentRoot(node)
        }}
        focusable
        onKeyDown={(event) => {
          if (event.name === 'escape' && !event.defaultPrevented) interaction.leave()
        }}
      >
        <SectionFilter
          api={api}
          interaction={interaction}
          id="filter"
          order={1}
          query={query()}
          placeholder="Filter..."
          onInput={setQuery}
        />
      </box>
    )
  }

  const setup = await testRender(() => <Harness />, { width: 30, height: 2 })
  const expectTextColor = (text: string, color: string) => {
    const lines = setup.captureCharFrame().split('\n')
    const y = lines.findIndex((line) => line.includes(text))
    const x = lines[y].indexOf(text)
    const buffer = setup.renderer.currentRenderBuffer
    const offset = (y * buffer.width + x) * 4

    expect(new RGBA(buffer.buffers.fg.slice(offset, offset + 4)).equals(RGBA.fromHex(color))).toBe(true)
  }

  try {
    await setup.flush()
    await Promise.resolve()
    interaction.focus(null)
    await setup.flush()
    expectTextColor('Filter...', theme.selectedListItemText)
    setup.mockInput.pressEnter()
    expect(api.renderer.currentFocusedRenderable?.id).not.toBe(root?.id)
    await setup.mockInput.typeText('jk')
    expect(query()).toBe('jk')
    await setup.flush()
    expectTextColor('jk', theme.selectedListItemText)
    expect(interaction.selectedId()).toBe('filter')

    setup.mockInput.pressEscape()
    await Bun.sleep(60)
    await setup.flush()
    expect(api.renderer.currentFocusedRenderable?.id).toBe(root?.id)
    setup.mockInput.pressEscape()
    await Bun.sleep(60)
    await setup.flush()
    expect(api.renderer.currentFocusedRenderable).toBeNull()
    setQuery('')
    await setup.flush()
    expectTextColor('Filter...', theme.textMuted)
  } finally {
    setup.renderer.destroy()
  }
})
