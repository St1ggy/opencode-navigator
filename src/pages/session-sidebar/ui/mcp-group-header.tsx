import { PLUGIN_ID } from '../../../shared/config'
import { SelectionBox, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function McpGroupHeader(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  bucket: string
  count: number
  action?: 'connect' | 'disconnect'
  disabled: boolean
  marginTop: number
  position: SidebarPosition
  onToggle: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const id = () => `${PLUGIN_ID}.mcp.group.${props.bucket}`
  const item = useSidebarItem(props.api, props.interaction, {
    id: id(),
    position: () => props.position,
    disabled: () => props.disabled || !props.action,
    activate: props.onToggle,
  })

  return (
    <SelectionBox
      ref={(node: BoxRenderable) => item.ref(node)}
      id={id()}
      height={1}
      marginTop={props.marginTop}
      flexDirection="row"
      justifyContent="space-between"
      gap={1}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseUp={(event) => {
        event.stopPropagation()
        item.activate(event)
      }}
    >
      <text
        flexGrow={1}
        minWidth={0}
        fg={item.focused() ? item.foregroundColor() : theme().textMuted}
        wrapMode="none"
        truncate
      >
        {props.bucket} ({props.count})
      </text>
      <text
        flexShrink={0}
        fg={item.focused() ? item.foregroundColor() : props.disabled ? theme().textMuted : theme().accent}
        wrapMode="none"
      >
        {props.action
          ? `${icons.icon(props.action === 'connect' ? 'connected' : 'disconnected')} ${props.action === 'connect' ? 'Connect' : 'Disconnect'}`
          : ''}
      </text>
    </SelectionBox>
  )
}
