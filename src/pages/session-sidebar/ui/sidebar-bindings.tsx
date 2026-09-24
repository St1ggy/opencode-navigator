import { createEffect, onCleanup } from 'solid-js'

import { createSidebarShortcutMode } from '../../../features/sidebar-shortcuts'
import { FOCUS_COMMAND, LEGACY_PLUGIN_ID, PLUGIN_ID } from '../../../shared/config'

import type { PreferencesController } from '../../../entities/preferences'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SidebarToggleBinding(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  const shortcuts = createSidebarShortcutMode(props.api)

  createEffect(() => shortcuts.bind(props.preferences.toggleKey()))
  onCleanup(shortcuts.dispose)

  return <box />
}

export function SidebarFocusBinding(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction: SidebarInteraction
}) {
  const commands = props.interaction.baseCommands()
  const unregisterCommands = props.api.keymap.registerLayer({
    commands: [
      ...commands,
      ...commands.map(({ name, run, enabled }) => ({
        name: name.replace(PLUGIN_ID, () => LEGACY_PLUGIN_ID),
        run,
        enabled,
      })),
    ],
  })

  onCleanup(unregisterCommands)
  createEffect(() => {
    const unregister = props.api.keymap.registerLayer({
      bindings: [{ key: props.preferences.focusKey(), cmd: FOCUS_COMMAND }],
    })

    onCleanup(unregister)
  })

  return <box />
}
