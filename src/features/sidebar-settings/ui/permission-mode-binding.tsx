import { createEffect, onCleanup } from 'solid-js'

import { currentPermissionMode } from '../../../entities/quick-action'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function PermissionModeBinding(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  let applying = false
  let observed: boolean | undefined

  createEffect(() => {
    if (!props.preferences.ready()) return

    const preferred = props.preferences.autoApprovePermissions()
    const current = currentPermissionMode(props.api)

    observed = current

    if (preferred === undefined || current === undefined || current === preferred) return

    applying = true
    try {
      props.api.keymap.dispatchCommand('permission.mode')
      observed = currentPermissionMode(props.api)
    } finally {
      applying = false
    }
  })

  const unsubscribe = props.api.keymap.on?.('state', () => {
    if (applying || !props.preferences.ready()) return

    const current = currentPermissionMode(props.api)

    if (current === undefined || current === observed) return

    observed = current
    props.preferences.setAutoApprovePermissions(current)
  })

  if (unsubscribe) onCleanup(unsubscribe)

  return <box />
}
