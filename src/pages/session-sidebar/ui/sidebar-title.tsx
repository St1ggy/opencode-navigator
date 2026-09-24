import { Show, createMemo, onCleanup } from 'solid-js'

import { openSettings } from '../../../features/sidebar-settings'
import { PLUGIN_ID } from '../../../shared/config'
import { IconControl, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function SidebarTitle(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  mcp?: McpController
  interaction: SidebarInteraction
  sessionID: string
  title: string
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const created = createMemo(() => {
    const value = props.api.state.session.get(props.sessionID)?.time?.created

    return value === undefined
      ? undefined
      : `Created ${new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })}`
  })
  const settingsId = `${PLUGIN_ID}.settings`
  const settings = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: settingsId,
      position: { section: 0, row: 0, column: 0 },
      activate: () => openSettings(props.api, props.preferences, undefined, props.mcp),
    },
    () => theme().textMuted,
    'control',
  )

  onCleanup(() => props.interaction.setTitleRoot(undefined))

  return (
    <box
      ref={(node: BoxRenderable) => props.interaction.setTitleRoot(node)}
      border={['bottom']}
      borderColor={theme().borderSubtle}
      paddingBottom={1}
    >
      <box flexDirection="row" justifyContent="space-between" gap={1}>
        <box flexGrow={1}>
          <text fg={theme().text} wrapMode="word">
            <b>{props.title}</b>
          </text>
          <Show when={created()}>{(value) => <text fg={theme().textMuted}>{value()}</text>}</Show>
        </box>
        <IconControl
          ref={(node: BoxRenderable) => settings.ref(node)}
          id={settingsId}
          icon={icons.icon('settings')}
          backgroundColor={settings.backgroundColor()}
          foregroundColor={settings.foregroundColor()}
          onMouseOver={settings.onMouseOver}
          onMouseOut={settings.onMouseOut}
          onMouseUp={(event) => settings.activate(event)}
        />
      </box>
    </box>
  )
}
