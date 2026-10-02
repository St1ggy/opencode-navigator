import { onCleanup } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'

import { openSettings } from './settings-dialog'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SettingsBinding(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  mcp?: McpController
  skills?: SkillController
}) {
  const unregister = props.api.keymap.registerLayer({
    mode: 'base',
    commands: [
      {
        name: `${PLUGIN_ID}.settings`,
        title: 'Navigator settings',
        category: 'Navigator',
        namespace: 'palette',
        enabled: () => ['home', 'session'].includes(props.api.route.current.name),
        run: () => openSettings(props.api, props.preferences, undefined, props.mcp, props.skills),
      },
    ],
    // String bindings treat commas as separators, so punctuation uses an object stroke.
    bindings: [{ key: { name: ',', ctrl: true }, cmd: `${PLUGIN_ID}.settings` }],
  })

  onCleanup(unregister)

  return <box />
}
