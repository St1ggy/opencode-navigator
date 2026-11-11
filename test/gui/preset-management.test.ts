import { expect, test } from 'bun:test'

import { createGuiPresetManagement } from '../../src/app/gui/preset-management'

import type { MonitoringRegistry } from '../../src/app/gui/monitoring-registry'
import type { PreferencesController } from '../../src/entities/preferences/model'
import type { Context } from '@opencode/plugin/gui'

test('preset management preserves cancelled/stale presets, serializes dialogs and validates observed MCP state', async () => {
  let resolve!: (value: boolean) => void
  let scope = 'global'
  let snapshot = 'original'
  let connected = false
  let mutating = false
  let dialogs = 0
  const changes: string[] = []
  const context = {
    signal: new AbortController().signal,
    sessions: { current: () => {} },
    router: { path: () => '/' },
    toast: { show() {} },
    dialogs: {
      prompt: async () => 'Renamed',
      confirm: () => {
        dialogs++

        return new Promise<boolean>((finish) => {
          resolve = finish
        })
      },
    },
  } as unknown as Context
  const preferences = {
    ready: () => true,
    selectedScopeKey: () => scope,
    layoutPresets: () => ({ Synthetic: snapshot }),
    mcpPresets: () => ({ Synthetic: snapshot }),
    exportPortableSettings: () => 'settings',
    renameLayoutPreset: () => changes.push('rename'),
    updateLayoutPreset: () => changes.push('update'),
    deleteLayoutPreset: () => changes.push('delete'),
    updateMcpPreset: () => changes.push('mcp-update'),
    flush: async () => {},
  } as unknown as PreferencesController
  const catalogs = {
    mcp: {
      capturePreset: () => ({ server: connected ? 'enabled' : 'disabled' }),
      mutating: () => mutating,
      state: () => ({ status: 'ready' }),
    },
  }
  const manage = createGuiPresetManagement(context, preferences, {
    active: () => ({ catalogs }),
  } as unknown as MonitoringRegistry)
  const cancel = manage('layout', 'Synthetic', 'delete')

  await manage('layout', 'Synthetic', 'delete')
  expect(dialogs).toBe(1)
  resolve(false)
  await cancel
  expect(changes).toEqual([])
  const staleScope = manage('layout', 'Synthetic', 'update')

  scope = 'worktree'
  resolve(true)
  await staleScope
  expect(changes).toEqual([])
  const stalePreset = manage('layout', 'Synthetic', 'delete')

  snapshot = 'changed'
  resolve(true)
  await stalePreset
  expect(changes).toEqual([])
  const staleMcp = manage('mcp', 'Synthetic', 'update')

  connected = true
  resolve(true)
  await staleMcp
  expect(changes).toEqual([])
  const busyMcp = manage('mcp', 'Synthetic', 'update')

  mutating = true
  resolve(true)
  await busyMcp
  expect(changes).toEqual([])
  mutating = false
  await manage('layout', 'Synthetic', 'rename')
  const update = manage('mcp', 'Synthetic', 'update')

  resolve(true)
  await update
  const remove = manage('layout', 'Synthetic', 'delete')

  resolve(true)
  await remove
  expect(changes).toEqual(['rename', 'mcp-update', 'delete'])
})
