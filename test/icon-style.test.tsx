/** @jsxImportSource @opentui/solid */
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { type JSX, onCleanup } from 'solid-js'

import { pluginConfig } from '../src/config'
import { QUICK_ACTIONS } from '../src/constants'
import { createPreferencesController } from '../src/controllers/preferences'
import { FirstRunWizard } from '../src/dialogs/first-run'
import { KeyboardHelpDialog } from '../src/dialogs/keyboard-help'
import { LayoutPresetPreview } from '../src/dialogs/layout-preset-preview'
import { McpPresetMenu } from '../src/dialogs/mcp-presets'
import { QuickActionsDialog } from '../src/dialogs/quick-actions'
import { SearchEverythingDialog } from '../src/dialogs/search'
import { SettingsDialog } from '../src/dialogs/settings'
import { SkillDialog } from '../src/dialogs/skill'
import { IconProvider } from '../src/icons/context'
import { quickActionIcon, sectionIcon, uiIcon } from '../src/icons/ui'
import { SidebarContent, SidebarTitle, createSidebarInteraction } from '../src/pages/session-sidebar'
import { SIDEBAR_SECTIONS } from '../src/state'

import type { McpController } from '../src/controllers/mcp'
import type { SkillController } from '../src/controllers/skills'
import type { SubagentController } from '../src/controllers/subagents'
import type { TodoController } from '../src/controllers/todo'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const privateUse = /[\u{E000}-\u{F8FF}\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/u

test('section and action icons provide Nerd Font glyphs and nonempty ASCII fallbacks', () => {
  for (const section of SIDEBAR_SECTIONS) {
    expect(sectionIcon(section, 'nerd')).toMatch(privateUse)
    expect(sectionIcon(section, 'text')).toMatch(/^[\u{20}-\u{7E}]+$/u)
  }
  for (const action of QUICK_ACTIONS) {
    expect(action.icon).toBe(quickActionIcon(action.command, 'nerd'))
    expect(action.icon).toMatch(privateUse)
    expect(quickActionIcon(action.command, 'text')).toMatch(/^[\u{20}-\u{7E}]+$/u)
  }
})

test('switching the shared icon preference updates every section and dialog without Nerd Font leaks', async () => {
  let commands: { name: string; run: () => void }[] = []
  const api = {
    route: { current: { name: 'session', params: { sessionID: 'one' } } },
    state: {
      path: { directory: '/repo', worktree: '/repo' },
      config: { lsp: true },
      session: {
        get: () => ({ directory: '/repo', time: { created: Date.UTC(2030, 0, 2), updated: Date.UTC(2030, 0, 2) } }),
        status: () => ({ type: 'busy' }),
      },
      lsp: () => [{ id: 'typescript', root: '/repo', status: 'connected' }],
    },
    theme: {
      current: {
        text: '#ffffff',
        textMuted: '#888888',
        primary: '#7aa2f7',
        accent: '#ff9e64',
        error: '#ff0000',
        warning: '#ffff00',
        info: '#00ffff',
        success: '#00ff00',
        borderSubtle: '#555555',
        backgroundElement: '#222222',
        backgroundPanel: '#111111',
        selectedListItemText: '#111111',
      },
    },
    keymap: {
      registerLayer: (layer: { commands?: typeof commands }) => {
        if (layer.commands) commands = layer.commands

        return () => {}
      },
      getCommandBindings: () => new Map(),
      dispatchCommand: () => ({ ok: true }),
    },
    keys: { formatBindings: () => '' },
    ui: { toast() {}, dialog: { open: false, replace() {}, clear() {}, setSize() {} } },
  } as unknown as TuiPluginApi
  const preferences = createPreferencesController(api, pluginConfig(undefined), {
    load: async () => ({
      global: {
        layout: {
          sections: {},
          expanded: { todo: true, subagents: true, skills: true, quick_actions: true, lsp: true, mcp: true },
        },
      },
      worktrees: {},
      user: { favoriteSkills: ['/skills/review'], recentSkills: ['/skills/review'], favoriteMcpServers: ['wiki'] },
    }),
    update: async () => {},
    flush: async () => {},
  })

  await preferences.load()
  preferences.saveLayoutPreset('Icons')
  const target = () => ({ key: 'test', routing: { directory: '/repo' }, scope: '/repo' })
  const state = () => ({ status: 'ready' as const })
  const skill = { name: 'review', location: '/skills/review', description: 'Review code', content: '' }
  const skills = {
    target,
    list: () => [skill, { ...skill, name: 'other', location: '/skills/other' }],
    state,
    refresh: async () => [],
  } as unknown as SkillController
  const mcp = {
    target,
    list: () => [
      { name: 'wiki', status: 'connected' },
      { name: 'other', status: 'disabled' },
    ],
    state,
    serverState: state,
    refresh: async () => [],
    mutating: () => false,
    bulkState: () => ({ status: 'idle' }),
  } as unknown as McpController
  const subagents = {
    target,
    list: () => [
      {
        session: { id: 'worker', title: 'Worker' },
        status: { type: 'retry', attempt: 1, message: 'Retrying', next: 0 },
      },
    ],
    recent: () => [],
    state,
    refresh: async () => {},
  } as unknown as SubagentController
  const todo = {
    target,
    list: () =>
      ['pending', 'in_progress', 'completed', 'cancelled'].map((status, index) => ({
        content: status,
        status,
        priority: ['high', 'medium', 'low', 'high'][index],
      })),
    state,
    refresh: async () => [],
  } as unknown as TodoController

  function Sidebar() {
    const interaction = createSidebarInteraction(api)

    onCleanup(() => interaction.dispose())

    return (
      <box>
        <SidebarTitle api={api} preferences={preferences} interaction={interaction} sessionID="one" title="Icon test" />
        <SidebarContent
          api={api}
          preferences={preferences}
          interaction={interaction}
          sessionID="one"
          skills={skills}
          mcp={mcp}
          subagents={subagents}
          todo={todo}
        />
      </box>
    )
  }
  const cases: { name: string; render: () => JSX.Element }[] = [
    { name: 'sidebar', render: () => <Sidebar /> },
    { name: 'settings', render: () => <SettingsDialog api={api} preferences={preferences} /> },
    {
      name: 'actions',
      render: () => (
        <box paddingTop={10}>
          <QuickActionsDialog api={api} preferences={preferences} />
        </box>
      ),
    },
    { name: 'setup', render: () => <FirstRunWizard api={api} preferences={preferences} /> },
    {
      name: 'skill',
      render: () => (
        <SkillDialog
          api={api}
          skill={skill}
          favorite={false}
          favoriteDisabled={false}
          onToggleFavorite={() => {}}
          onAccept={() => {}}
        />
      ),
    },
    {
      name: 'search',
      render: () => (
        <box paddingTop={25}>
          <SearchEverythingDialog api={api} preferences={preferences} skills={skills} subagents={subagents} mcp={mcp} />
        </box>
      ),
    },
    { name: 'help', render: () => <KeyboardHelpDialog api={api} /> },
    {
      name: 'presets',
      render: () => (
        <McpPresetMenu
          api={api}
          title="MCP presets"
          options={[{ title: 'Save', value: 'save', description: 'Save states', icon: 'save' }]}
          onSelect={() => {}}
        />
      ),
    },
    {
      name: 'preset preview',
      render: () => (
        <box paddingTop={10}>
          <LayoutPresetPreview api={api} preferences={preferences} name="Icons" />
        </box>
      ),
    },
  ]

  for (const entry of cases) {
    function Harness() {
      Object.assign(api, { renderer: useRenderer() })

      return <IconProvider style={preferences.lspIconStyle}>{entry.render()}</IconProvider>
    }
    const setup = await testRender(() => <Harness />, { width: 110, height: 100 })

    try {
      await setup.flush()

      if (entry.name === 'search') {
        const next = commands.find((command) => command.name.endsWith('.next-tab'))!

        next.run()
        next.run()
        next.run()
        await setup.flush()
      }

      expect(setup.captureCharFrame(), entry.name).toMatch(privateUse)

      if (['sidebar', 'actions', 'search'].includes(entry.name)) {
        for (const action of QUICK_ACTIONS.slice(0, 5))
          expect(setup.captureCharFrame(), `${entry.name}: ${action.label}`).toContain(quickActionIcon(action.command))
      }

      preferences.toggleLspIconStyle()
      await setup.flush()
      const text = setup.captureCharFrame()

      expect(text, entry.name).not.toMatch(privateUse)

      if (['sidebar', 'actions', 'search'].includes(entry.name)) {
        for (const action of QUICK_ACTIONS.slice(0, 5))
          expect(text, `${entry.name}: ${action.label}`).toContain(quickActionIcon(action.command, 'text'))
      }

      if (entry.name === 'sidebar') {
        expect(text).toContain('TS')
        expect(text).toContain(uiIcon('settings', 'text'))
      } else if (entry.name === 'settings' || entry.name === 'search') {
        const next = commands.find((command) => command.name.endsWith('.next-tab'))!

        for (let index = 0; index < (entry.name === 'settings' ? 4 : 3); index++) {
          next.run()
          await setup.flush()
          expect(setup.captureCharFrame(), `${entry.name} tab ${index}`).not.toMatch(privateUse)
        }
      }

      preferences.toggleLspIconStyle()
      await setup.flush()
      expect(setup.captureCharFrame(), entry.name).toMatch(privateUse)
    } finally {
      setup.renderer.destroy()
    }
  }
  await preferences.flush()
})
