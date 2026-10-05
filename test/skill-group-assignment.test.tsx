/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { Show, createSignal } from 'solid-js'

import {
  SettingsDialog,
  createDialogStack,
  // @ts-expect-error The package intentionally publishes JavaScript without declarations.
} from '../dist/tui.js'
import { pluginConfig } from '../src/config'
import { createPreferencesController } from '../src/controllers/preferences'
import { GroupAssignmentDialog } from '../src/features/sidebar-settings/ui/group-assignment-dialog'
import { SkillGroupsDialog } from '../src/features/sidebar-settings/ui/skill-groups-dialog'
import { IconProvider } from '../src/icons/context'

import type { PreferencesController } from '../src/controllers/preferences'
import type { SkillController } from '../src/controllers/skills'
import type { SkillInfo } from '../src/entities/skill'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

function setup() {
  const commands = new Map<string, () => void>()
  const [groups, setGroups] = createSignal<Record<string, string>>({ '/absent/review/SKILL.md': 'Research' })
  const [items, setItems] = createSignal<SkillInfo[]>([])
  let replaced = 0
  let cleared = 0
  const api = {
    theme: { current: { text: '#ffffff', textMuted: '#888888', backgroundElement: '#222222' } },
    keymap: {
      registerLayer: (layer: { commands?: { name: string; run: () => void }[] }) => {
        const layerCommands = layer.commands ?? []

        for (const command of layerCommands) commands.set(command.name, command.run)

        return () => {}
      },
    },
    ui: { dialog: { replace: () => replaced++, clear: () => cleared++, setSize() {} } },
  } as unknown as TuiPluginApi
  const preferences = {
    skillGroups: groups,
    setSkillGroup(location: string, group?: string) {
      setGroups((current) => {
        const next = { ...current }

        if (group) next[location] = group
        else delete next[location]

        return next
      })
    },
  } as unknown as PreferencesController
  const skills = {
    target: () => ({ key: 'workspace' }),
    list: items,
    state: () => ({ status: 'ready' }),
    refresh: async () => {
      setItems([
        { name: 'review', location: '/workspace/review/SKILL.md', content: '' },
        { name: 'search', location: '/workspace/search/SKILL.md', content: '' },
      ])
    },
  } as unknown as SkillController

  return { api, commands, groups, preferences, skills, replaced: () => replaced, cleared: () => cleared }
}

test('Skill group manager shows the full workspace list and keeps absent assignments', async () => {
  const model = setup()
  const view = await testRender(
    () => (
      <IconProvider style={() => 'nerd'}>
        <SkillGroupsDialog api={model.api} preferences={model.preferences} skills={model.skills} />
      </IconProvider>
    ),
    { width: 65, height: 20 },
  )

  try {
    await view.flush()
    const frame = view.captureCharFrame()

    expect(frame).toContain('Skill groups · user-wide')
    expect(frame).toContain('review')
    expect(frame).toContain('search')
    expect(frame).toContain('not in workspace')
    expect(frame).toContain('Research')
    model.commands.get('opencode-navigator.selection-menu.select')?.()
    expect(model.replaced()).toBe(1)
  } finally {
    view.renderer.destroy()
  }
})

test('Skill group assignment offers existing, new and Ungrouped options for an exact source', async () => {
  const model = setup()
  const location = '/workspace/review/SKILL.md'
  const view = await testRender(
    () => (
      <IconProvider style={() => 'nerd'}>
        <GroupAssignmentDialog
          api={model.api}
          title="Group for review"
          assigned={() => model.groups()[location]}
          groups={() => [...new Set(Object.values(model.groups()))]}
          onAssign={(group) => model.preferences.setSkillGroup(location, group)}
        />
      </IconProvider>
    ),
    { width: 48, height: 16 },
  )

  try {
    await view.flush()
    expect(view.captureCharFrame()).toContain('Research')
    expect(view.captureCharFrame()).toContain('Create new group')
    expect(view.captureCharFrame()).toContain('Ungrouped')
    model.commands.get('opencode-navigator.selection-menu.select')?.()
    expect(model.groups()[location]).toBe('Research')
    expect(model.cleared()).toBe(1)
  } finally {
    view.renderer.destroy()
  }
})

test('Settings Sections opens the built Skill group manager by mouse and keyboard', async () => {
  for (const mode of ['mouse', 'keyboard'] as const) {
    let open!: (render: () => JSX.Element) => void
    const opened = new Promise<() => JSX.Element>((resolve) => {
      open = resolve
    })
    const commands = new Map<string, () => void>()
    const api = {
      theme: {
        current: {
          text: '#ffffff',
          textMuted: '#888888',
          accent: '#00ffff',
          backgroundElement: '#222222',
          backgroundPanel: '#111111',
          borderSubtle: '#444444',
        },
      },
      keymap: {
        registerLayer: (layer: { commands?: { name: string; run: () => void }[] }) => {
          const layerCommands = layer.commands ?? []

          for (const command of layerCommands) commands.set(command.name, command.run)

          return () => {}
        },
      },
      ui: {
        toast: ({ message }: { message: string }) => {
          throw new Error(message)
        },
        dialog: { open: true, replace: (render: () => JSX.Element) => open(render), setSize() {}, clear() {} },
      },
    } as unknown as TuiPluginApi
    const preferences = createPreferencesController(api, pluginConfig(undefined), {
      load: async () => ({ global: {}, worktrees: {}, user: {} }),
      update: async () => {},
      flush: async () => {},
    })

    await preferences.load()
    const skills = {
      target: () => ({ key: 'workspace' }),
      list: () => [{ name: 'review', location: '/workspace/review/SKILL.md', content: '' }],
      state: () => ({ status: 'ready' }),
      refresh: async () => [],
    } as unknown as SkillController
    const settingsView = await testRender(
      () => <SettingsDialog api={api} preferences={preferences} skills={skills} activeValue="skills" />,
      { width: 100, height: 30 },
    )
    let manager: Awaited<ReturnType<typeof testRender>> | undefined

    try {
      await settingsView.flush()

      if (mode === 'mouse') {
        const lines = settingsView.captureCharFrame().split('\n')
        const row = lines.findIndex((line) => line.includes('Skills') && line.includes('Groups'))

        expect(row).toBeGreaterThan(-1)
        await settingsView.mockMouse.click(lines[row].indexOf('Groups'), row)
      } else commands.get('opencode-navigator.settings.groups')?.()

      const render = await opened

      manager = await testRender(() => render(), { width: 70, height: 18 })
      await manager.flush()
      expect(manager.captureCharFrame()).toContain('Skill groups · user-wide')
      expect(manager.captureCharFrame()).toContain('review')
    } finally {
      manager?.renderer.destroy()
      settingsView.renderer.destroy()
    }
  }
})

test('built Skill group dialogs retain the parent Settings state across nested navigation', async () => {
  const [modal, setModal] = createSignal<() => JSX.Element>()
  let onClose: (() => void) | undefined
  const api = {
    theme: {
      current: {
        text: '#ffffff',
        textMuted: '#888888',
        accent: '#00ffff',
        primary: '#00ffff',
        backgroundElement: '#222222',
        backgroundPanel: '#111111',
        borderSubtle: '#444444',
        selectedListItemText: '#111111',
      },
    },
    keymap: { registerLayer: () => () => {} },
    ui: {
      toast({ message }: { message: string }) {
        throw new Error(message)
      },
      dialog: {
        get open() {
          return Boolean(modal())
        },
        replace(render: () => JSX.Element, close?: () => void) {
          onClose?.()
          onClose = close
          setModal(() => render)
        },
        clear() {
          onClose?.()
          setModal(undefined)
        },
        setSize() {},
      },
    },
  } as unknown as TuiPluginApi
  const preferences = createPreferencesController(api, pluginConfig(undefined), {
    load: async () => ({ global: {}, worktrees: {}, user: {} }),
    update: async () => {},
    flush: async () => {},
  })

  await preferences.load()
  preferences.setSkillGroup('/absent/skill/SKILL.md', 'Research')
  const skills = {
    target: () => ({ key: 'workspace' }),
    list: () => [{ name: 'review', location: '/workspace/review/SKILL.md', content: '' }],
    state: () => ({ status: 'ready' }),
    refresh: async () => [],
  } as unknown as SkillController
  const view = await testRender(
    () => (
      <Show keyed when={modal()}>
        {(render) => render()}
      </Show>
    ),
    {
      width: 100,
      height: 32,
    },
  )
  const stack = createDialogStack(api)

  async function click(label: string) {
    const lines = view.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes(label))

    expect(row).toBeGreaterThan(-1)
    await view.mockMouse.click(lines[row].indexOf(label), row)
    await view.flush()
  }

  try {
    stack.open(() => <SettingsDialog api={api} preferences={preferences} skills={skills} activeValue="skills" />)
    await view.flush()
    await click('Groups')
    expect(view.captureCharFrame()).toContain('Skill groups · user-wide')
    await click('review')
    expect(view.captureCharFrame()).toContain('Group for review')
    await click('Research')
    expect(preferences.skillGroups()['/workspace/review/SKILL.md']).toBe('Research')
    expect(view.captureCharFrame()).toContain('Skill groups · user-wide')
    stack.back()
    await view.flush()
    expect(view.captureCharFrame()).toContain('Navigator settings')
    expect(view.captureCharFrame()).toContain('Groups')
  } finally {
    view.renderer.destroy()
  }
})
