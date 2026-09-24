import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadConfiguredDefaults } from '../src/app/configured-defaults'
import {
  configuredDefaultsFromPluginOptions,
  createPreferencesController,
  mergeConfiguredDefaults,
  parseConfiguredDefaults,
} from '../src/entities/preferences'
import { pluginConfig } from '../src/shared/config'

import type { PreferencesStore } from '../src/entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('parses every portable configured setting and excludes private state', () => {
  const configured = parseConfiguredDefaults({
    behavior: {
      toggleKey: ' alt+b ',
      persistMcp: false,
      cornerFont: false,
      rowDensity: 'comfortable',
      sectionItemLimits: { todo: 4, unknown: 1 },
      quickActionVisibility: { 'session.rename': false },
    },
    layout: { sections: { todo: false }, expanded: { mcp: true }, order: ['mcp', 'todo'] },
    mcp: { docs: 'enabled', broken: 'pending' },
    layoutPresets: { Focus: { sections: { skills: false }, expanded: { todo: true } } },
    mcpPresets: { Work: { docs: 'enabled' } },
    workspaceProfiles: { Focus: 'Work' },
    mcpServerGroups: { docs: 'Documentation' },
    favoriteSkills: ['/private/skill'],
    favoriteQuickActions: ['session.rename'],
    onboardingCompleted: true,
  })

  expect(configured.behavior).toMatchObject({
    toggleKey: 'alt+b',
    persistMcp: false,
    cornerFont: false,
    rowDensity: 'comfortable',
    sectionItemLimits: { todo: 4 },
    quickActionVisibility: { 'session.rename': false },
  })
  expect(configured.layout?.sections).toEqual({ todo: false })
  expect(configured.layout?.expanded).toEqual({ mcp: true })
  expect(configured.layout?.order?.slice(0, 2)).toEqual(['mcp', 'todo'])
  expect(configured.desiredMcpStates).toEqual({ docs: 'enabled' })
  expect(configured.layoutPresets?.Focus?.sections).toEqual({ skills: false })
  expect(configured.mcpPresets).toEqual({ Work: { docs: 'enabled' } })
  expect(configured.workspaceProfiles).toEqual({ Focus: 'Work' })
  expect(configured.mcpServerGroups).toEqual({ docs: 'Documentation' })
  expect(configured).not.toHaveProperty('favoriteSkills')
  expect(configured).not.toHaveProperty('favoriteQuickActions')
  expect(configured).not.toHaveProperty('onboardingCompleted')
})

test('deep-merges configured sources while replacing ordered lists', () => {
  const merged = mergeConfiguredDefaults(
    parseConfiguredDefaults({
      behavior: { sectionItemLimits: { todo: 2, skills: 3 } },
      layout: { sections: { todo: true, skills: true }, order: ['todo', 'skills'] },
      mcp: { docs: 'disabled' },
      layoutPresets: { Focus: { sections: { todo: true }, expanded: { todo: false } } },
    }),
    parseConfiguredDefaults({
      behavior: { sectionItemLimits: { todo: 5 } },
      layout: { sections: { skills: false }, order: ['mcp'] },
      mcp: { docs: 'enabled', tracker: 'disabled' },
      layoutPresets: { Focus: { expanded: { todo: true } } },
    }),
  )

  expect(merged.behavior?.sectionItemLimits).toEqual({ todo: 5, skills: 3 })
  expect(merged.layout?.sections).toEqual({ todo: true, skills: false })
  expect(merged.layout?.order?.[0]).toBe('mcp')
  expect(merged.desiredMcpStates).toEqual({ docs: 'enabled', tracker: 'disabled' })
  expect(merged.layoutPresets?.Focus).toMatchObject({ sections: { todo: true }, expanded: { todo: true } })
})

test('keeps flat plugin options compatible and gives canonical values precedence', () => {
  const configured = configuredDefaultsFromPluginOptions({
    toggle_key: 'alt+b',
    sections: { todo: false },
    behavior: { toggleKey: 'ctrl+x', persistMcp: false },
    layout: { sections: { todo: true }, expanded: { mcp: true } },
    mcp: { docs: 'enabled' },
  })

  expect(configured.behavior?.toggleKey).toBe('ctrl+x')
  expect(configured.behavior?.persistMcp).toBe(false)
  expect(configured.layout?.sections?.todo).toBe(true)
  expect(configured.layout?.expanded?.mcp).toBe(true)
  expect(configured.desiredMcpStates).toEqual({ docs: 'enabled' })
})

test('loads user and project files above plugin options without coupling failures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'navigator-config-'))
  const config = join(root, 'opencode')
  const userDirectory = join(root, '.opencode-navigator')
  const warnings: string[] = []
  const api = {
    state: { path: { config } },
    ui: { toast: (toast: { message: string }) => warnings.push(toast.message) },
  } as unknown as TuiPluginApi

  try {
    await mkdir(userDirectory)
    await writeFile(
      join(userDirectory, 'settings.json'),
      JSON.stringify({ behavior: { rowDensity: 'comfortable' }, mcp: { docs: 'disabled' } }),
    )
    const configured = await loadConfiguredDefaults(api, { row_density: 'compact' }, async () =>
      JSON.stringify({ behavior: { persistMcp: false }, mcp: { docs: 'enabled' } }),
    )

    expect(configured.behavior?.rowDensity).toBe('comfortable')
    expect(configured.behavior?.persistMcp).toBe(false)
    expect(configured.desiredMcpStates).toEqual({ docs: 'enabled' })
    expect(warnings).toEqual([])

    const fallback = await loadConfiguredDefaults(api, undefined, async () => '{')

    expect(fallback.behavior?.rowDensity).toBe('comfortable')
    expect(fallback.desiredMcpStates).toEqual({ docs: 'disabled' })
    expect(warnings[0]).toContain('.opencode/navigator.json')

    warnings.length = 0
    await loadConfiguredDefaults(api, undefined, async () => '')
    expect(warnings).toEqual([])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects non-object configuration documents', () => {
  expect(() => parseConfiguredDefaults([])).toThrow('Expected a JSON object')
})

test('keeps configured defaults below persisted preferences and restores them on reset', async () => {
  const api = { ui: { toast() {} } } as unknown as TuiPluginApi
  const store: PreferencesStore = {
    async load() {
      return {
        global: {
          behavior: { rowDensity: 'compact' },
          layout: { sections: { todo: true }, expanded: {} },
          mcp: { docs: 'disabled' as const },
        },
        worktrees: {},
        user: {
          layoutPresets: { Saved: { sections: { mcp: false }, expanded: {} } },
          mcpPresets: { Saved: { docs: 'disabled' as const } },
          workspaceProfiles: { Saved: 'Saved' },
          mcpServerGroups: { docs: 'Saved group' },
        },
      }
    },
    async update() {},
    async flush() {},
  }
  const configured = parseConfiguredDefaults({
    behavior: { rowDensity: 'comfortable' },
    layout: { sections: { todo: false }, expanded: { mcp: true } },
    mcp: { docs: 'enabled' },
    layoutPresets: { Configured: { sections: { todo: false }, expanded: {} } },
    mcpPresets: { Configured: { docs: 'enabled' } },
    workspaceProfiles: { Configured: 'Configured' },
    mcpServerGroups: { tracker: 'Configured group' },
  })
  const controller = createPreferencesController(api, pluginConfig(undefined), store, configured)

  expect(controller.rowDensity()).toBe('comfortable')
  expect(controller.sections().todo).toBe(false)
  expect(controller.desiredMcpState('global', 'docs')).toBe('enabled')
  await controller.load()
  expect(controller.rowDensity()).toBe('compact')
  expect(controller.sections().todo).toBe(true)
  expect(controller.desiredMcpState('global', 'docs')).toBe('disabled')
  expect(Object.keys(controller.layoutPresets())).toEqual(['Configured', 'Saved'])
  expect(Object.keys(controller.mcpPresets())).toEqual(['Configured', 'Saved'])
  expect(controller.workspaceProfiles()).toEqual({ Configured: 'Configured', Saved: 'Saved' })
  expect(controller.mcpServerGroups()).toEqual({ tracker: 'Configured group', docs: 'Saved group' })

  controller.resetPluginSettings()
  controller.resetSections()
  controller.resetMcpStates()
  expect(controller.rowDensity()).toBe('comfortable')
  expect(controller.sections().todo).toBe(false)
  expect(controller.desiredMcpState('global', 'docs')).toBe('enabled')
})
