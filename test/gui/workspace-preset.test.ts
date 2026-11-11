import { expect, test } from 'bun:test'

import { createWorkspacePresetPreview } from '../../src/features/sidebar-settings/model'

import type { McpController } from '../../src/entities/mcp/model'
import type { PreferencesController } from '../../src/entities/preferences/model'

test('linked workspace profiles do not apply a layout without the matching MCP controller or after a link changes', async () => {
  let link: string | undefined = 'Synthetic MCP'
  let layouts = 0
  let mutations = 0
  const preferences = {
    selectedScopeKey: () => 'global',
    preferenceScopeLabel: () => 'Global',
    layoutPresets: () => ({ Synthetic: { sections: { todo: true }, expanded: {} } }),
    mcpPresets: () => ({ 'Synthetic MCP': { server: 'enabled' } }),
    workspaceProfiles: () => (link ? { Synthetic: link } : {}),
    previewLayoutPreset: () => ({ next: {}, rows: [] }),
    applyLayoutPreset: () => {
      layouts++
    },
  } as unknown as PreferencesController
  const withoutServer = createWorkspacePresetPreview(preferences, 'Synthetic')

  expect(withoutServer.blocked()).toContain('matching server')
  expect(withoutServer.apply()).toBeUndefined()
  expect(layouts).toBe(0)
  const controller = {
    target: () => ({ key: 'selected-server', scope: '/synthetic' }),
    list: () => [{ name: 'server', status: 'disabled' }],
    state: () => ({ status: 'ready' }),
    mutating: () => false,
    bulkState: () => ({ failed: [] }),
    applyPreset: async () => {
      mutations++
    },
    refresh: async () => {},
  } as unknown as McpController
  const model = createWorkspacePresetPreview(preferences, 'Synthetic', controller)

  expect(model.blocked()).toBe('')
  link = undefined
  expect(model.apply()).toBeUndefined()
  expect(mutations).toBe(0)
  link = 'Synthetic MCP'
  await model.apply()
  expect(layouts).toBe(1)
  expect(mutations).toBe(1)
})
