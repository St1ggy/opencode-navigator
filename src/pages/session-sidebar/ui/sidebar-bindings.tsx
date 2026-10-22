import { Show, Suspense, createEffect, onCleanup, untrack } from 'solid-js'

import { SidebarShortcutHint, createSidebarShortcutMode } from '../../../features/sidebar-shortcuts'
import { FOCUS_COMMAND, LEGACY_PLUGIN_ID, PLUGIN_ID } from '../../../shared/config'

import type { PreferencesController } from '../../../entities/preferences'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SidebarToggleBinding(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  const shortcuts = createSidebarShortcutMode(props.api)

  createEffect(() => {
    const key = props.preferences.toggleKey()

    untrack(() => shortcuts.bind(key))
  })
  createEffect(() => {
    if (
      shortcuts.active() &&
      (props.api.route.current.name !== 'session' || props.api.ui.dialog.open || props.api.mode.current() === 'modal')
    )
      untrack(shortcuts.cancel)
  })
  onCleanup(shortcuts.dispose)

  return (
    <box position="absolute" top={0} left={0} width="100%" height="100%" visible={shortcuts.active()}>
      <Show when={shortcuts.active()}>
        <Suspense>
          <SidebarShortcutHint api={props.api} actions={shortcuts.actions} />
        </Suspense>
      </Show>
    </box>
  )
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
