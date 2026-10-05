import { SelectionBox } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function LimitsAction(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  position: SidebarPosition
  label: string
  disabled?: boolean
  onActivate: () => void
}) {
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id,
    position: () => props.position,
    disabled: () => props.disabled === true,
    activate: props.onActivate,
  })

  return (
    <SelectionBox
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.id}
      height={1}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseUp={(event) => {
        event.stopPropagation()
        item.activate(event)
      }}
    >
      <text fg={item.foregroundColor()} wrapMode="none" truncate>
        {props.label}
      </text>
    </SelectionBox>
  )
}
