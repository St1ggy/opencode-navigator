import { createSignal } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { IconControl, useIcons } from '../../../shared/ui'

import { openSettings } from './settings-dialog'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SettingsFooterButton(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  mcp?: McpController
}) {
  const icons = useIcons()
  const [hovered, setHovered] = createSignal(false)
  const theme = () => props.api.theme.current

  return (
    <box flexDirection="row" justifyContent="flex-end">
      <IconControl
        id={`${PLUGIN_ID}.settings.footer`}
        icon={icons.icon('settings')}
        foregroundColor={hovered() ? theme().text : theme().textMuted}
        backgroundColor={hovered() ? theme().backgroundElement : theme().backgroundPanel}
        onMouseOver={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
        onMouseUp={() => openSettings(props.api, props.preferences, undefined, props.mcp)}
      />
    </box>
  )
}
