import { expect, test } from 'bun:test'

import { createPreferencesController } from '../src/entities/preferences'
import { openLimitsRefreshPrompt } from '../src/features/sidebar-settings/model/limits-refresh-prompt'
import { pluginConfig } from '../src/shared/config'

import type { DialogNavigation } from '../src/shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('the interval prompt validates, returns to settings, and rejects a changed preference scope', async () => {
  const api = { ui: { toast() {} } } as unknown as TuiPluginApi
  const preferences = createPreferencesController(api, pluginConfig(undefined), {
    load: async () => ({ global: {}, worktrees: {}, user: {} }),
    async update() {},
    async flush() {},
  })
  let prompt!: { value: string; onConfirm: (value: string) => void }
  let backs = 0
  const dialogs = {
    prompt: (value: typeof prompt) => {
      prompt = value
    },
    back: () => {
      backs++
    },
  } as unknown as DialogNavigation

  await preferences.load()
  preferences.setActiveScope('/workspace')
  openLimitsRefreshPrompt(api, preferences, dialogs)
  expect(prompt.value).toBe('5')
  expect(() => prompt.onConfirm('0')).toThrow('at least 1')
  expect(() => prompt.onConfirm('0.5')).toThrow('whole minutes')
  expect(backs).toBe(0)
  prompt.onConfirm('10')
  expect(preferences.selectedLimitsRefreshMinutes()).toBe(10)
  expect(backs).toBe(1)
  openLimitsRefreshPrompt(api, preferences, dialogs)
  preferences.setPreferenceScope('worktree')
  expect(() => prompt.onConfirm('1')).toThrow('scope changed')
  expect(preferences.selectedLimitsRefreshMinutes()).toBe(10)
})
