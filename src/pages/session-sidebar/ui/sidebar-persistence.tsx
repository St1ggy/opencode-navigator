import { createEffect, createMemo, onCleanup, untrack } from 'solid-js'

import { type PreferencesController, preferencesScope } from '../../../entities/preferences'
import { showFirstRunWizard } from '../../../features/sidebar-settings'
import { currentLocation } from '../../../shared/lib/location'

import type { McpController } from '../../../entities/mcp'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpPersistence(props: { api: TuiPluginApi; controller: McpController }) {
  const persist = createMemo(() => props.controller.persist())

  createEffect(() => {
    if (!props.api.state.ready) return

    persist()
    const route = props.api.route.current
    const params = 'params' in route ? route.params : undefined

    if (typeof params?.sessionID !== 'string') return

    const current = props.controller.target()

    onCleanup(() => props.controller.deactivate(current))
    untrack(() => void props.controller.activate(current).catch(() => {}))
  })

  return <box />
}

export function PreferencesPersistence(props: { api: TuiPluginApi; controller: PreferencesController }) {
  createEffect(() => {
    const location = currentLocation(props.api)

    untrack(() =>
      props.controller.setActiveScope(
        preferencesScope({ directory: location.routing.directory, worktree: props.api.state.path.worktree }),
      ),
    )
    void props.controller.load()
  })

  return <box />
}

export function FirstRunWizardPersistence(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  let isChecked = false

  createEffect(() => {
    if (isChecked) return

    isChecked = true
    void showFirstRunWizard(props.api, props.preferences).catch(() => {})
  })

  return <box />
}
