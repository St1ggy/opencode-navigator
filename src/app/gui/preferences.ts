import { createEffect, untrack } from 'solid-js'

import { configuredDefaultsFromPluginOptions, createPreferencesModel } from '../../entities/preferences/model'
import { pluginConfig } from '../../shared/config'

import { guiPreferenceScope } from './adapters/preference-scope'
import { createGuiPreferencesStore } from './adapters/preferences'
import { guiPreferenceSession } from './adapters/settings-session'
import { createGuiConfiguredDefaults } from './configured-defaults'
import { createGuiNotifications } from './notifications'

import type { Context } from '@opencode/plugin/gui'

export function createGuiPreferences(context: Context) {
  const model = createPreferencesModel(
    {
      notifications: createGuiNotifications(context),
      // GUI does not edit or dispatch terminal keybindings; preserve their saved values.
      validKey: () => true,
    },
    pluginConfig(context.options),
    createGuiPreferencesStore(context),
    configuredDefaultsFromPluginOptions(context.options),
  )

  createEffect(() => {
    const scope = guiPreferenceScope(guiPreferenceSession(context))

    untrack(() => model.setActiveScope(scope))
  })
  void model.load()
  const configured = createGuiConfiguredDefaults(context, model)

  return {
    ...model,
    async reloadFromFile() {
      await model.reloadFromFile()
      await configured.reload()
    },
  }
}
