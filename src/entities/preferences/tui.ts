import { createPreferencesModel } from './model/preferences-controller'

import type { PluginConfig } from '../../shared/config'
import type { ConfiguredDefaults } from './model/configured-defaults'
import type { PreferencesStore } from './model/updates'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createPreferencesController(
  api: TuiPluginApi,
  defaults: PluginConfig,
  store: PreferencesStore,
  configured: ConfiguredDefaults = {},
) {
  return createPreferencesModel(
    {
      notifications: { show: (input) => api.ui.toast({ ...input, duration: 4000 }) },
      validKey: (value) =>
        api.keymap?.parseKeySequence ? api.keymap.parseKeySequence(value).length > 0 : Boolean(value.trim()),
    },
    defaults,
    store,
    configured,
  )
}
