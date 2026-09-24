import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { pluginConfig } from '../src/config'
import { DEFAULT_SECTION_EXPANSION } from '../src/constants'
import { createPreferencesController } from '../src/controllers/preferences'
import { type PreferencesStore, createPreferencesStore } from '../src/preferences-store'
import { QUICK_ACTION_IDS } from '../src/quick-actions'
import { showFirstRunWizard } from '../src/tui'

import type { SectionVisibility, SidebarSection } from '../src/state'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function pluginDefaults(sections: SectionVisibility) {
  return {
    sections,
    toggleKey: 'ctrl+shift+b',
    focusKey: 'ctrl+shift+f',
    searchKey: 'ctrl+shift+k',
    persistMcp: true,
    cornerFont: true,
    lspIconStyle: 'nerd' as const,
    rowDensity: 'compact' as const,
    sectionItemLimits: {},
    quickActionOrder: [...QUICK_ACTION_IDS],
    quickActionVisibility: {},
  }
}

function memoryStore(): PreferencesStore {
  return {
    async load() {
      return {
        global: {},
        worktrees: {},
        user: {},
      }
    },
    async update() {},
    async flush() {},
  }
}

test('persists scoped limits before hydration and restores inherited defaults', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-limits-'))
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginConfig({ section_item_limits: { todo: 2 } })

  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))

    controller.setSectionItemLimit('todo', 5)
    controller.setSectionItemLimit('skills', 7)
    await controller.load()
    controller.setActiveScope('/repo')
    controller.setPreferenceScope('worktree')
    controller.setSectionItemLimit('todo', 0)
    await controller.flush()
    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await restarted.load()
    restarted.setActiveScope('/repo')
    restarted.setPreferenceScope('worktree')
    expect(restarted.sectionItemLimit('todo')).toBe(0)
    expect(restarted.selectedSectionItemLimit('skills')).toBe(7)
    expect(() => restarted.setSectionItemLimit('todo', -1)).toThrow('whole number')
    restarted.resetPluginSettings()
    expect(restarted.sectionItemLimit('todo')).toBe(5)
    restarted.setPreferenceScope('global')
    restarted.resetPluginSettings()
    expect(restarted.sectionItemLimit('todo')).toBe(2)
    expect(restarted.sectionItemLimit('skills')).toBe(0)
    await restarted.flush()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('row density updates immediately with scoped inheritance and reset', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-density-'))
  const api = { ui: { toast() {} } } as unknown as TuiPluginApi
  const defaults = pluginConfig(undefined)

  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await controller.load()
    expect(controller.rowDensity()).toBe('compact')
    controller.toggleRowDensity()
    expect(controller.rowDensity()).toBe('comfortable')
    controller.setActiveScope('/repo')
    controller.setPreferenceScope('worktree')
    expect(controller.selectedRowDensity()).toBe('comfortable')
    controller.toggleRowDensity()
    expect(controller.rowDensity()).toBe('compact')
    await controller.flush()

    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await restarted.load()
    restarted.setActiveScope('/repo')
    restarted.setPreferenceScope('worktree')
    expect(restarted.rowDensity()).toBe('compact')
    restarted.resetPluginSettings()
    expect(restarted.rowDensity()).toBe('comfortable')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('exports and imports portable settings only after a validated preview', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-portable-controller-'))
  const api = { ui: { toast() {} } } as unknown as TuiPluginApi

  try {
    const store = createPreferencesStore(directory)
    const controller = createPreferencesController(api, pluginConfig(undefined), store)

    await controller.load()
    controller.setActiveScope('/repo')
    controller.setPreferenceScope('worktree')
    controller.toggleSelectedSection('todo')
    const exported = JSON.parse(controller.exportPortableSettings())

    expect(exported.format).toBe('opencode-navigator/settings')
    expect(exported.layout.sections.todo).toBe(false)
    expect(JSON.stringify(exported)).not.toContain('/repo')
    expect(
      controller.previewPortableSettings(
        JSON.stringify({ format: 'opencode-navigator/settings', version: 1, layout: {} }),
      ).layoutChanged,
    ).toBe(true)
    const preview = controller.previewPortableSettings(
      JSON.stringify({
        format: 'opencode-navigator/settings',
        version: 1,
        layout: { sections: { todo: true }, expanded: { mcp: true } },
        mcp: { wiki: 'disabled' },
        future: true,
      }),
    )

    expect(preview.layoutChanged).toBe(true)
    expect(preview.mcpChanged).toBe(true)
    expect(preview.unsupported).toEqual(['/future'])
    expect(controller.selectedSections().todo).toBe(false)
    await controller.applyPortableSettings(preview)
    expect(controller.selectedSections().todo).toBe(true)
    expect(controller.selectedExpanded().mcp).toBe(true)
    expect(controller.desiredMcpState('/repo', 'wiki')).toBe('disabled')
    const stale = controller.previewPortableSettings(
      JSON.stringify({ format: 'opencode-navigator/settings', version: 1, mcp: { wiki: 'enabled' } }),
    )

    await store.update({ target: { kind: 'worktree', key: '/repo' }, mcp: { name: 'context7', state: 'enabled' } })
    await expect(controller.applyPortableSettings(stale)).rejects.toThrow('Settings changed after this preview')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('quick action settings persist per scope with leaf-wise inheritance and reset', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-actions-'))
  const api = { ui: { toast() {} } } as unknown as TuiPluginApi

  try {
    const controller = createPreferencesController(api, pluginConfig(undefined), createPreferencesStore(directory))

    await controller.load()
    controller.toggleQuickAction('session.rename')
    controller.moveQuickAction('session.export', -1)
    controller.setActiveScope('/repo')
    controller.setPreferenceScope('worktree')
    controller.toggleQuickAction('session.timeline')
    await controller.flush()
    const restarted = createPreferencesController(api, pluginConfig(undefined), createPreferencesStore(directory))

    await restarted.load()
    restarted.setActiveScope('/repo')
    restarted.setPreferenceScope('worktree')
    expect(restarted.quickActionVisible('session.rename')).toBe(false)
    expect(restarted.quickActionVisible('session.timeline')).toBe(false)
    expect(restarted.quickActionOrder()[2]).toBe('session.export')
    restarted.resetPluginSettings()
    expect(restarted.quickActionVisible('session.rename')).toBe(false)
    expect(restarted.quickActionVisible('session.timeline')).toBe(true)
    await restarted.flush()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('Quick Action favorites are user-wide and independent of scoped order', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-action-favorites-'))
  const api = { ui: { toast() {} } } as unknown as TuiPluginApi

  try {
    const controller = createPreferencesController(api, pluginConfig(undefined), createPreferencesStore(directory))

    await controller.load()
    controller.setActiveScope('/repo')
    controller.setPreferenceScope('worktree')
    controller.moveQuickAction('session.export', -1)
    controller.toggleFavoriteQuickAction('session.export')
    await controller.flush()

    const restarted = createPreferencesController(api, pluginConfig(undefined), createPreferencesStore(directory))

    await restarted.load()
    expect(restarted.favoriteQuickActions()).toEqual(new Set(['session.export']))
    expect(restarted.quickActionOrder()[0]).toBe('session.rename')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('persists section visibility and skipped skill confirmations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  const values = new Map<string, unknown>()
  const api = {
    kv: {
      ready: true,
      get: (key: string) => values.get(key),
      set: (key: string, value: unknown) => values.set(key, value),
    },
  } as unknown as TuiPluginApi
  const defaults: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: false,
  }
  const review = { name: 'review', location: '/skills/review', content: '', description: 'Review code' }
  const commit = { name: 'commit', location: '/skills/commit', content: '', description: 'Create commits' }

  try {
    const controller = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))

    await controller.load()
    expect(controller.sections()).toEqual(defaults)
    expect(controller.shouldConfirmSkill(review)).toBe(true)
    expect(controller.shouldConfirmSkill(commit)).toBe(true)

    controller.toggleSection('lsp')
    expect(controller.sections().lsp).toBe(false)
    controller.toggleSectionExpanded('skills')
    expect(controller.expanded().skills).toBe(true)
    controller.skipSkillConfirmation(review)
    controller.skipSkillConfirmation(commit)
    expect(controller.skippedSkillCount()).toBe(2)
    expect(controller.trustedSkillLocations()).toEqual(['/skills/commit', '/skills/review'])
    controller.revokeSkillConfirmation(review.location)
    expect(controller.shouldConfirmSkill(review)).toBe(true)
    expect(controller.shouldConfirmSkill(commit)).toBe(false)
    await controller.saveLayoutAsDefault()
    await controller.flush()

    const restarted = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))

    await restarted.load()
    expect(restarted.sections()).toEqual({ ...defaults, lsp: false })
    expect(restarted.expanded()).toEqual({ ...DEFAULT_SECTION_EXPANSION, skills: true })

    controller.toggleSection('todo')
    controller.toggleSectionExpanded('skills')
    const unchanged = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))

    await unchanged.load()
    expect(unchanged.sections()).toEqual({ ...defaults, lsp: false })
    expect(unchanged.expanded()).toEqual({ ...DEFAULT_SECTION_EXPANSION, skills: true })

    controller.resetSkillConfirmations()
    controller.resetSections()
    await controller.flush()
    expect(controller.skippedSkillCount()).toBe(0)
    expect(controller.sections()).toEqual(defaults)
    expect(controller.expanded()).toEqual(DEFAULT_SECTION_EXPANSION)
    expect(values.size).toBe(0)

    const configured = { ...defaults, mcp: true }
    const reset = createPreferencesController(api, pluginDefaults(configured), createPreferencesStore(directory))

    await reset.load()
    expect(reset.sections()).toEqual(configured)
    expect(reset.expanded()).toEqual(DEFAULT_SECTION_EXPANSION)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('visibility toggles preserve the effective section order in global and worktree scopes', async () => {
  const order: SidebarSection[] = ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp']
  const api = { ui: { toast() {} } } as unknown as TuiPluginApi
  const store: PreferencesStore = {
    async load() {
      return {
        global: { layout: { sections: { mcp: false }, expanded: {}, order: [...order] } },
        worktrees: { '/repo': { layout: { sections: { skills: false }, expanded: {} } } },
        user: {},
      }
    },
    async update() {},
    async flush() {},
  }
  const controller = createPreferencesController(api, pluginConfig(undefined), store)

  await controller.load()
  controller.toggleSelectedSection('mcp')
  expect(controller.selectedSectionOrder()).toEqual(order)
  expect(controller.selectedSections().mcp).toBe(true)

  controller.setActiveScope('/repo')
  controller.setPreferenceScope('worktree')
  controller.toggleSelectedSection('skills')
  expect(controller.selectedSectionOrder()).toEqual(order)
  expect(controller.selectedSections().skills).toBe(true)
})

test('merges interactions made before storage hydration with saved preferences', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  let isReady = false
  const values = new Map<string, unknown>()
  const api = {
    kv: {
      get ready() {
        return isReady
      },
      get: (key: string) => values.get(key),
      set: (key: string, value: unknown) => values.set(key, value),
    },
  } as unknown as TuiPluginApi
  const defaults: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  }
  const commit = { name: 'commit', location: '/skills/commit', content: '' }
  const review = { name: 'review', location: '/skills/review', content: '' }

  try {
    const controller = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))

    controller.toggleSection('skills')
    controller.toggleSection('lsp')
    controller.setFocusKey('alt+f')
    controller.setSearchKey('alt+y')
    controller.skipSkillConfirmation(review)
    controller.skipSkillConfirmation(commit)
    isReady = true
    await controller.load()
    await controller.saveLayoutAsDefault()
    await controller.flush()

    expect(controller.sections()).toEqual({ ...defaults, skills: false, lsp: false })
    expect(controller.shouldConfirmSkill(review)).toBe(false)
    expect(controller.shouldConfirmSkill(commit)).toBe(false)
    expect(controller.focusKey()).toBe('alt+f')

    const restarted = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))

    await restarted.load()
    expect(restarted.sections()).toEqual({ ...defaults, skills: false, lsp: false })
    expect(restarted.focusKey()).toBe('alt+f')
    expect(restarted.searchKey()).toBe('alt+y')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('saves a default layout before storage hydration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  let isReady = false
  const api = {
    kv: {
      get ready() {
        return isReady
      },
      get: () => {},
      set: () => {},
    },
  } as unknown as TuiPluginApi
  const defaults: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  }

  try {
    const controller = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))

    controller.toggleSection('lsp')
    controller.toggleSectionExpanded('skills')
    await controller.saveLayoutAsDefault()
    await controller.flush()

    isReady = true
    const restarted = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))

    await restarted.load()
    expect(restarted.sections().lsp).toBe(false)
    expect(restarted.expanded().skills).toBe(true)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('preserves resets made before storage hydration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  let isReady = false
  const api = {
    kv: {
      get ready() {
        return isReady
      },
      get: () => {},
      set: () => {},
    },
  } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })

  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))

    controller.setFocusKey('alt+f')
    controller.resetPluginSettings()
    controller.resetSections()
    controller.resetSkillConfirmations()
    isReady = true
    await controller.load()
    await controller.flush()

    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await restarted.load()
    expect(restarted.sections()).toEqual(defaults.sections)
    expect(restarted.focusKey()).toBe(defaults.focusKey)
    expect(restarted.skippedSkillCount()).toBe(0)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('persists behavior settings and restores configured defaults', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  const api = {
    kv: { ready: true, get: () => {}, set: () => {} },
    keymap: {
      parseKeySequence: (value: string) => {
        if (!value.trim()) throw new Error('invalid')

        return [value]
      },
    },
  } as unknown as TuiPluginApi
  const sections: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  }

  try {
    const controller = createPreferencesController(api, pluginDefaults(sections), createPreferencesStore(directory))

    await controller.load()
    controller.setToggleKey('alt+s')
    controller.setFocusKey('alt+f')
    controller.toggleMcpPersistence()
    controller.toggleLspIconStyle()
    expect(() => controller.setToggleKey(' ')).toThrow('Enter a valid OpenCode keybinding')
    await controller.flush()

    const changedDefaults = {
      ...pluginDefaults(sections),
      toggleKey: 'ctrl+b',
    }
    const restarted = createPreferencesController(api, changedDefaults, createPreferencesStore(directory))

    await restarted.load()
    expect(restarted.toggleKey()).toBe('alt+s')
    expect(restarted.focusKey()).toBe('alt+f')
    expect(restarted.persistMcp()).toBe(false)
    expect(restarted.lspIconStyle()).toBe('text')

    restarted.resetPluginSettings()
    await restarted.flush()

    const reset = createPreferencesController(api, changedDefaults, createPreferencesStore(directory))

    await reset.load()
    expect(reset.toggleKey()).toBe('ctrl+b')
    expect(reset.focusKey()).toBe('ctrl+shift+f')
    expect(reset.persistMcp()).toBe(true)
    expect(reset.lspIconStyle()).toBe('nerd')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('resolves worktree overrides, section order, and scoped resets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  const api = {
    keymap: { parseKeySequence: (value: string) => [value] },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })

  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await controller.load()
    controller.setFocusKey('alt+g')
    controller.setDesiredMcpState('global', 'wiki', 'enabled')
    controller.setActiveScope('/repo-a')
    controller.setPreferenceScope('worktree')
    controller.setFocusKey('alt+w')
    controller.toggleSection('mcp')
    controller.moveSection('mcp', -1)
    await controller.saveLayoutAsDefault()
    controller.setDesiredMcpState('/repo-a', 'wiki', 'disabled')
    await controller.flush()

    controller.setActiveScope('/repo-b')
    expect(controller.focusKey()).toBe('alt+g')
    expect(controller.sections().mcp).toBe(true)
    expect(controller.desiredMcpState('/repo-b', 'wiki')).toBe('enabled')

    controller.setActiveScope('/repo-a')
    expect(controller.focusKey()).toBe('alt+w')
    expect(controller.sections().mcp).toBe(false)
    expect(controller.sectionOrder().indexOf('mcp')).toBe(4)
    expect(controller.desiredMcpState('/repo-a', 'wiki')).toBe('disabled')

    controller.resetSections()
    controller.resetPluginSettings()
    controller.resetMcpStates()
    await controller.flush()
    expect(controller.focusKey()).toBe('alt+g')
    expect(controller.sections().mcp).toBe(true)
    expect(controller.desiredMcpState('/repo-a', 'wiki')).toBe('enabled')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('saves the active worktree session layout when global scope is selected', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })

  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await controller.load()
    controller.setActiveScope('/repo-a')
    controller.toggleSelectedSection('lsp')
    expect(controller.sections().lsp).toBe(false)
    await controller.saveLayoutAsDefault()
    controller.setActiveScope('/repo-b')
    expect(controller.sections().lsp).toBe(false)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('applies a global visibility edit through an unrelated worktree expansion override', async () => {
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: false,
  })
  const controller = createPreferencesController(api, defaults, memoryStore())

  await controller.load()
  controller.setActiveScope('/repo-a')
  controller.toggleSectionExpanded('skills')
  controller.toggleSelectedSection('mcp')

  expect(controller.expanded().skills).toBe(true)
  expect(controller.sections().mcp).toBe(true)
})

test('keeps an explicit worktree visibility override over Global', async () => {
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: false,
  })
  const controller = createPreferencesController(api, defaults, memoryStore())

  await controller.load()
  controller.setActiveScope('/repo-a')
  controller.setPreferenceScope('worktree')
  controller.toggleSelectedSection('mcp')
  controller.setPreferenceScope('global')
  controller.toggleSelectedSection('mcp')
  controller.toggleSelectedSection('mcp')

  expect(controller.selectedSections().mcp).toBe(false)
  expect(controller.sections().mcp).toBe(true)
})

test('creates, applies, updates, renames, deletes, and persists layout presets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })

  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await controller.load()
    expect(controller.layoutPresets()).toEqual({})

    controller.setActiveScope('/repo-a')
    controller.setPreferenceScope('worktree')
    controller.toggleSelectedSection('lsp')
    controller.moveSelectedSection('mcp', -1)
    expect(controller.saveLayoutPreset(' Focus ')).toBe('Focus')
    expect(() => controller.saveLayoutPreset('focus')).toThrow('already exists')

    controller.toggleSelectedSection('lsp')
    controller.applyLayoutPreset(controller.layoutPresets().Focus)
    expect(controller.selectedSections().lsp).toBe(false)
    expect(controller.selectedSectionOrder().indexOf('mcp')).toBe(4)

    controller.toggleSelectedSection('skills')
    expect(controller.updateLayoutPreset('Focus')).toBe(true)
    expect(controller.renameLayoutPreset('Focus', 'Deep work')).toBe('Deep work')
    expect(controller.layoutPresets().Focus).toBeUndefined()
    expect(controller.layoutPresets()['Deep work'].sections.skills).toBe(false)
    await controller.flush()

    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await restarted.load()
    expect(Object.keys(restarted.layoutPresets())).toEqual(['Deep work'])
    expect(restarted.deleteLayoutPreset('Deep work')).toBe(true)
    expect(restarted.deleteLayoutPreset('Deep work')).toBe(false)
    await restarted.flush()

    const cleared = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await cleared.load()
    expect(cleared.layoutPresets()).toEqual({})
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('manages user-wide MCP presets and favorite skills', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })
  const review = { name: 'review', location: '/skills/review', content: '' }

  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await controller.load()
    expect(controller.saveMcpPreset(' Work ', { wiki: 'disabled', context7: 'enabled' })).toBe('Work')
    controller.saveLayoutPreset('Focus')
    controller.linkWorkspaceProfile('Focus', 'Work')
    expect(controller.workspaceProfiles()).toEqual({ Focus: 'Work' })
    expect(controller.renameLayoutPreset('Focus', 'Review layout')).toBe('Review layout')
    expect(() => controller.saveMcpPreset('work', { wiki: 'enabled' })).toThrow('already exists')
    controller.toggleFavoriteSkill(review)
    controller.toggleFavoriteMcpServer('wiki')
    controller.setMcpServerGroup('wiki', ' Docs ')
    await controller.recordSkillUse(review)
    expect(controller.isFavoriteSkill(review)).toBe(true)
    expect(controller.updateMcpPreset('Work', { wiki: 'enabled' })).toBe(true)
    expect(controller.renameMcpPreset('Work', 'Review')).toBe('Review')
    expect(controller.workspaceProfiles()).toEqual({ 'Review layout': 'Review' })
    controller.setActiveScope('/another-worktree')
    expect(controller.mcpPresets()).toEqual({ Review: { wiki: 'enabled' } })
    expect(controller.mcpServerGroups().wiki).toBe('Docs')
    expect(controller.isFavoriteSkill(review)).toBe(true)
    await controller.flush()

    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await restarted.load()
    expect(restarted.mcpPresets()).toEqual({ Review: { wiki: 'enabled' } })
    expect(restarted.workspaceProfiles()).toEqual({ 'Review layout': 'Review' })
    expect(restarted.isFavoriteSkill(review)).toBe(true)
    expect(restarted.favoriteMcpServers().has('wiki')).toBe(true)
    expect(restarted.mcpServerGroups().wiki).toBe('Docs')
    restarted.setMcpServerGroup('wiki')
    restarted.toggleFavoriteMcpServer('wiki')
    expect(restarted.recentSkills()).toEqual([review.location])
    expect(restarted.deleteMcpPreset('Review')).toBe(true)
    expect(restarted.workspaceProfiles()).toEqual({})
    restarted.toggleFavoriteSkill(review)
    await restarted.flush()

    const cleared = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await cleared.load()
    expect(cleared.mcpPresets()).toEqual({})
    expect(cleared.isFavoriteSkill(review)).toBe(false)
    expect(cleared.favoriteMcpServers().size).toBe(0)
    expect(cleared.mcpServerGroups()).toEqual({})
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('defers favorite toggles and MCP preset editing until hydration', async () => {
  let finish!: () => void
  const review = { name: 'review', location: '/skills/review', content: '' }
  const store: PreferencesStore = {
    load: () =>
      new Promise((resolve) => {
        finish = () => resolve({ global: {}, worktrees: {}, user: { favoriteSkills: [review.location] } })
      }),
    async update() {},
    async flush() {},
  }
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })
  const controller = createPreferencesController(api, defaults, store)

  controller.toggleFavoriteSkill(review)
  expect(() => controller.saveMcpPreset('Work', { wiki: 'enabled' })).toThrow('still loading')
  finish()
  await controller.load()
  await Promise.resolve()
  expect(controller.ready()).toBe(true)
  expect(controller.isFavoriteSkill(review)).toBe(false)
})

test('reconciles conflicting MCP preset saves from independent controllers', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  const toasts: string[] = []
  const api = {
    ui: { toast: (toast: { message: string }) => toasts.push(toast.message) },
  } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })

  try {
    const first = createPreferencesController(api, defaults, createPreferencesStore(directory))
    const second = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await Promise.all([first.load(), second.load()])
    first.saveMcpPreset('Focus', { wiki: 'enabled' })
    second.saveMcpPreset('focus', { wiki: 'disabled' })
    await Promise.all([first.flush(), second.flush()])

    const persisted = (await createPreferencesStore(directory).load()).user.mcpPresets ?? {}

    expect(first.mcpPresets()).toEqual(persisted)
    expect(second.mcpPresets()).toEqual(persisted)
    expect(toasts).toContain('Preset changed in another OpenCode instance; reloaded saved presets')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('opens the setup wizard only once after preference hydration', async () => {
  const values = new Map<string, unknown>()
  let opened = 0
  const api = {
    kv: {
      ready: true,
      get: (key: string) => values.get(key),
      set: (key: string, value: unknown) => values.set(key, value),
    },
    ui: {
      dialog: {
        replace: () => opened++,
        setSize() {},
      },
    },
  } as unknown as TuiPluginApi
  const defaults: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  }
  const preferences = createPreferencesController(api, pluginDefaults(defaults), memoryStore())

  expect(await showFirstRunWizard(api, preferences)).toBe(true)
  expect(opened).toBe(1)
  expect(values.size).toBe(0)
  expect(await showFirstRunWizard(api, preferences)).toBe(false)
  expect(opened).toBe(1)
})

test('persists onboarding completion across controller restarts without changing KV', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-preferences-'))
  const values = new Map<string, unknown>()
  let opened = 0
  const api = {
    state: { path: {} },
    kv: { ready: true, get: (key: string) => values.get(key), set: () => {} },
    ui: { dialog: { replace: () => opened++, setSize() {} }, toast: () => {} },
  } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })

  try {
    const first = createPreferencesController(api, defaults, createPreferencesStore(directory))

    expect(await showFirstRunWizard(api, first)).toBe(true)
    await first.flush()
    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))

    expect(await showFirstRunWizard(api, restarted)).toBe(false)
    expect(opened).toBe(1)
    expect(values.size).toBe(0)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
