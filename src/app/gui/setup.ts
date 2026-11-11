import { Command } from '@opencode/plugin/gui'

import { registerMonitoring } from './monitoring-contributions'
import { createGuiPreferences } from './preferences'

import type { Plugin } from '@opencode/plugin/gui'

export const setup: Plugin.Setup = (context) => {
  const preferences = createGuiPreferences(context)

  registerMonitoring(context, preferences)

  context.add(Command, () => ({
    id: 'version',
    title: context.t('command.version'),
    async run() {
      try {
        await preferences.flush()
        context.toast.show({ title: `Navigator ${__NAVIGATOR_VERSION__}`, variant: 'default' })
      } catch {
        context.toast.show({ title: 'Navigator Desktop services are unavailable', variant: 'error' })
      }
    },
  }))
}
