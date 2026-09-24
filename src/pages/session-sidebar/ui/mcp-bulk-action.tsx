import { SelectionBox } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function McpBulkAction(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  position: SidebarPosition
  label: string
  disabled: boolean
  onActivate: () => void
}) {
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id,
    position: () => props.position,
    disabled: () => props.disabled,
    activate: props.onActivate,
  })

  return (
    <SelectionBox
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.id}
      height={1}
      minWidth={0}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => item.activate(event)}
    >
      <text fg={item.foregroundColor()} wrapMode="none" truncate height={1}>
        {props.label}
      </text>
    </SelectionBox>
  )
}
