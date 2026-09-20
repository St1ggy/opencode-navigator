import { type BoxRenderable, TextAttributes } from '@opentui/core'

import { useIcons } from '../icons/context'

import { useSidebarItem } from './common'
import { SelectionBox } from './selection-box'

import type { SidebarInteraction, SidebarOrder } from '../sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function TodoFilterTab(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  order: SidebarOrder
  label: string
  count: number
  selected: boolean
  onActivate: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id,
    order: () => props.order,
    activate: props.onActivate,
  })
  const focused = () => item.focused()

  return (
    <SelectionBox
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.id}
      height={1}
      minWidth={0}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={
        focused() ? item.backgroundColor() : props.selected ? theme().backgroundElement : item.backgroundColor()
      }
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => item.select(event)}
      onMouseUp={(event) => {
        event.stopPropagation()
        item.activate(event)
      }}
    >
      <text
        fg={focused() ? item.foregroundColor() : props.selected ? theme().accent : item.foregroundColor()}
        attributes={props.selected ? TextAttributes.BOLD : undefined}
        wrapMode="none"
        truncate
        height={1}
      >
        {icons.icon(props.selected ? 'radioOn' : 'radioOff')} {props.label} {props.count}
      </text>
    </SelectionBox>
  )
}
