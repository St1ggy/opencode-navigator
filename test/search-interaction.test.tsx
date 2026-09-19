/** @jsxImportSource @opentui/solid */
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui'
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { type JSX, Show, createSignal } from 'solid-js'

import { SearchBinding } from '../src/components/search-binding'
import { pluginConfig } from '../src/config'
import { SEARCH_COMMAND } from '../src/constants'
import { type PreferencesController, createPreferencesController } from '../src/controllers/preferences'
import { sectionIcon } from '../src/icons/ui'
import { SEARCH_GROUPS, type SearchGroup, searchContext } from '../src/search'

import type { McpController } from '../src/controllers/mcp'
import type { SkillController } from '../src/controllers/skills'
import type { SubagentController } from '../src/controllers/subagents'
import type { SearchServices } from '../src/dialogs/search'
import type { SidebarInteraction } from '../src/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { InputRenderable } from '@opentui/core'

test('Search Everything supports typing, tabs, skill confirmation and source actions', async () => {
  const [modal, setModal] = createSignal<() => JSX.Element>()
  const [dialogSize, setDialogSize] = createSignal('medium')
  const [sessionID, setSessionID] = createSignal('session')
  const [busy, setBusy] = createSignal(false)
  const [skillError, setSkillError] = createSignal(false)
  let isFailSkills = false
  let api!: TuiPluginApi
  let preferences!: PreferencesController
  let prompt: InputRenderable | undefined
  const used: string[] = []
  const opened: string[] = []
  const toggled: string[] = []
  const actions: string[] = []
  let actionFocus: string | undefined
  const items = ['alpha', 'review-code'].map((name) => ({
    name,
    location: `/skills/${name}`,
    description: 'Review source',
    content: '',
  }))

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    const register = keymap.registerLayer.bind(keymap)

    keymap.registerLayer = (layer) => {
      const copy = { ...layer }

      Reflect.deleteProperty(copy, 'mode')

      return register(copy)
    }
    api = {
      renderer,
      keymap,
      route: {
        get current() {
          return { name: 'session', params: { sessionID: sessionID() } }
        },
      },
      state: { path: { directory: '/repo', worktree: '/repo' }, session: { get: () => ({ directory: '/repo' }) } },
      theme: {
        current: {
          text: '#ffffff',
          textMuted: '#aaaaaa',
          accent: '#00ffff',
          primary: '#00ffff',
          error: '#ff0000',
          backgroundElement: '#222222',
          backgroundPanel: '#111111',
          selectedListItemText: '#111111',
        },
      },
      lifecycle: { signal: new AbortController().signal },
      ui: {
        toast() {},
        dialog: {
          get open() {
            return Boolean(modal())
          },
          setSize: setDialogSize,
          replace: (render: () => JSX.Element) => setModal(() => render),
          clear: () => {
            setModal(undefined)
            prompt?.focus()
          },
        },
      },
    } as unknown as TuiPluginApi
    preferences = createPreferencesController(
      api,
      pluginConfig({ sections: { skills: false }, section_item_limits: { skills: 1 } }),
      {
        load: async () => ({ global: {}, worktrees: {}, user: {} }),
        update: async () => {},
        flush: async () => {},
      },
    )
    keymap.registerLayer({
      commands: [
        {
          name: 'session.export',
          run: () => {
            actions.push('export')
            actionFocus = renderer.currentFocusedRenderable?.id
          },
        },
      ],
    })
    const skills = {
      target: () => searchContext(api).location,
      list: () => items,
      refresh: async () => {
        setSkillError(isFailSkills)

        if (isFailSkills) throw new Error('offline')

        return items
      },
      state: () => (skillError() ? { status: 'error', error: { message: 'offline' } } : { status: 'ready' }),
      use: async (_target: unknown, name: string) => {
        used.push(name)

        return true
      },
    } as unknown as SkillController
    const subagents = {
      list: () => [{ session: { id: 'worker', title: 'Worker task' }, status: { type: 'busy' } }],
      recent: () => [],
      state: () => ({ status: 'ready' }),
      refresh: async () => {},
      open: (id: string) => opened.push(id),
    } as unknown as SubagentController
    const mcp = {
      target: () => ({ ...searchContext(api).location, scope: '/repo' }),
      list: () => [{ name: 'wiki', status: 'connected' }],
      state: () => ({ status: 'ready' }),
      refresh: async () => [],
      mutating: busy,
      bulkState: () => ({ status: 'idle' }),
      toggle: async (name: string) => {
        toggled.push(name)
      },
    } as unknown as McpController
    const interaction = { ownsFocus: () => false, savedReturnTarget: () => null } as unknown as SidebarInteraction

    return (
      <box width="100%" height="100%">
        <input id="prompt" ref={(node) => (prompt = node)} focused />
        <SearchBinding
          api={api}
          preferences={preferences}
          skills={skills}
          subagents={subagents}
          mcp={mcp}
          interaction={interaction}
        />
        <Show keyed when={modal()}>
          {(render) => (
            <box position="absolute" top={0} left={0} width="100%" height="100%" paddingTop={10} alignItems="center">
              <box width={dialogSize() === 'medium' ? 60 : 88} paddingTop={1} flexShrink={0}>
                {render()}
              </box>
            </box>
          )}
        </Show>
      </box>
    )
  }
  const setup = await testRender(() => <Harness />, { width: 90, height: 40 })

  async function open(query = '', tab: SearchGroup = 'Skills') {
    api.keymap.dispatchCommand(SEARCH_COMMAND)
    await Bun.sleep(60)
    await setup.flush()

    if (query) {
      await setup.mockInput.typeText(query)
      await setup.flush()
    }

    for (let index = 0; index < SEARCH_GROUPS.indexOf(tab); index++) setup.mockInput.pressTab()
    await setup.flush()
  }
  try {
    await setup.flush()
    await open()
    let frame = setup.captureCharFrame()

    expect(frame).toContain('Search Everything')
    expect(frame).toContain('Skills (2)')
    expect(frame).toContain('Subagents (1)')
    expect(frame).toContain(`${sectionIcon('skills')} Skills (2)`)
    expect(frame).toContain(`${sectionIcon('subagents')} Subagents (1)`)
    expect(frame).toContain(`${sectionIcon('mcp')} MCP (1)`)
    expect(frame).toContain(`${sectionIcon('quick_actions')} Actions (5)`)
    expect(frame).not.toContain('Worker task')
    setup.mockInput.pressTab()
    setup.mockInput.pressEnter()
    await setup.flush()
    expect(opened).toEqual(['worker'])
    await open('rvwcd')
    async function clickTab(label: string) {
      const lines = setup.captureCharFrame().split('\n')
      const row = lines.findIndex((line) => line.includes(label))

      await setup.mockMouse.click(lines[row].indexOf(label), row)
      await setup.flush()
    }
    await clickTab('MCP (0)')
    expect(setup.captureCharFrame()).toContain('rvwcd')
    expect(setup.captureCharFrame()).toContain('No matching results')
    expect(setup.captureCharFrame()).not.toContain('review-code')
    await clickTab('Skills (1)')
    expect(setup.captureCharFrame()).toContain('review-code')
    setup.mockInput.pressEnter()
    await setup.flush()
    expect(used).toEqual([])
    expect(setup.captureCharFrame()).toContain('Source')
    expect(dialogSize()).toBe('medium')
    setup.mockInput.pressEscape()
    await Bun.sleep(60)
    await setup.flush()
    expect(dialogSize()).toBe('large')
    expect(setup.captureCharFrame()).toContain('Search Everything')
    expect(setup.captureCharFrame()).toContain('rvwcd')
    expect(setup.captureCharFrame()).toContain('review-code')
    setup.mockInput.pressEnter()
    await setup.flush()
    const cancelLines = setup.captureCharFrame().split('\n')
    const cancelRow = cancelLines.findIndex((line) => line.includes('Cancel'))

    await setup.mockMouse.click(cancelLines[cancelRow].indexOf('Cancel'), cancelRow)
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Search Everything')
    expect(used).toEqual([])
    await setup.mockMouse.moveTo(0, 0)
    setup.mockInput.pressEnter()
    await setup.flush()
    setup.mockInput.pressEnter()
    await setup.flush()
    expect(used).toEqual(['review-code'])
    expect(preferences.recentSkills()).toEqual(['/skills/review-code'])
    await open('wiki', 'MCP')
    setBusy(true)
    await setup.flush()
    setup.mockInput.pressEnter()
    expect(toggled).toEqual([])
    expect(modal()).toBeDefined()
    setBusy(false)
    await setup.flush()
    setup.mockInput.pressEnter()
    await setup.flush()
    expect(toggled).toEqual(['wiki'])
    await open('export', 'Actions')
    setup.mockInput.pressEnter()
    await setup.flush()
    expect(actions).toEqual(['export'])
    expect(actionFocus).toBe('prompt')
    isFailSkills = true
    await open('rvwcd')
    expect(setup.captureCharFrame()).toContain('Skills: offline')
    expect(setup.captureCharFrame()).toContain('review-code')
    isFailSkills = false
    setup.mockInput.pressKey('r', { ctrl: true })
    await setup.flush()
    expect(setup.captureCharFrame()).not.toContain('Skills: offline')
    setup.mockInput.pressEscape()
    await Bun.sleep(60)
    await setup.flush()
    await open('absent')
    frame = setup.captureCharFrame()
    expect(frame).toContain('No matching results')
    setup.mockInput.pressEscape()
    await Bun.sleep(60)
    await setup.flush()
    expect(modal()).toBeUndefined()
    expect(api.renderer.currentFocusedRenderable?.id).toBe('prompt')
    await open()
    setup.mockInput.pressEnter()
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Source')
    setSessionID('different')
    await setup.flush()
    expect(modal()).toBeUndefined()
    preferences.setSearchKey('alt+y')
    await setup.flush()
    setup.mockInput.pressKey('y', { meta: true })
    await Bun.sleep(60)
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Search Everything')
  } finally {
    setup.renderer.destroy()
  }
})

test('search binding replaces shortcuts and cancels pending opens on disposal', async () => {
  const [key, setKey] = createSignal('ctrl+shift+k')
  const bindings: string[] = []
  const removed: string[] = []
  let open: (() => void) | undefined
  let opened = 0
  const api = {
    route: { current: { name: 'home' } },
    state: { path: { directory: '/repo' } },
    keymap: {
      registerLayer: (layer: { commands?: { run: () => void }[]; bindings?: { key: string }[] }) => {
        if (layer.commands) open = layer.commands[0].run

        const binding = layer.bindings?.[0]?.key

        if (binding) bindings.push(binding)

        return () => {
          if (binding) removed.push(binding)
        }
      },
    },
    ui: { dialog: { replace: () => opened++, open: false } },
  } as unknown as TuiPluginApi
  const services = { api, preferences: { searchKey: key } } as unknown as SearchServices
  const setup = await testRender(() => <SearchBinding {...services} interaction={{} as SidebarInteraction} />, {
    width: 10,
    height: 1,
  })

  await setup.flush()
  setKey('alt+y')
  await setup.flush()
  expect(bindings).toEqual(['ctrl+shift+k', 'alt+y'])
  expect(removed).toEqual(['ctrl+shift+k'])
  open?.()
  setup.renderer.destroy()
  await Bun.sleep(60)
  expect(opened).toBe(0)
  expect(removed).toEqual(['ctrl+shift+k', 'alt+y'])
})
