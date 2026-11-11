import { expect, test } from 'bun:test'

import { createGuiSettingsActions } from '../../src/app/gui/settings-actions'

import type { MonitoringRegistry } from '../../src/app/gui/monitoring-registry'
import type { PreferencesController } from '../../src/entities/preferences/model'
import type { Context } from '@opencode/plugin/gui'

test('GUI resets reject stale scope, cancel without changes and serialize confirmation', async () => {
  let scope = 'global'
  let confirm!: (value: boolean) => void
  let prompts = 0
  const applied: string[] = []
  const context = {
    signal: new AbortController().signal,
    sessions: { current: () => {} },
    router: { path: () => '/' },
    toast: { show() {} },
    dialogs: {
      confirm: () => {
        prompts++

        return new Promise<boolean>((resolve) => {
          confirm = resolve
        })
      },
    },
  } as unknown as Context
  const preferences = {
    ready: () => true,
    selectedScopeKey: () => scope,
    resetSections: () => applied.push('layout'),
    resetPluginSettings: () => applied.push('behavior'),
    resetMcpStates: () => applied.push('mcp'),
    resetSkillConfirmations: () => applied.push('trust'),
    flush: async () => {},
  } as unknown as PreferencesController
  const services = createGuiSettingsActions(context, preferences, { active: () => {} } as unknown as MonitoringRegistry)
  const stale = services.reset('layout')

  scope = 'worktree'
  confirm(true)
  await stale
  expect(applied).toEqual([])
  const cancelled = services.reset('behavior')

  confirm(false)
  await cancelled
  expect(applied).toEqual([])
  const accepted = services.reset('trust')

  await services.reset('mcp')
  expect(prompts).toBe(3)
  confirm(true)
  await accepted
  expect(applied).toEqual(['trust'])
})
