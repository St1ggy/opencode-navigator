import { type BoxRenderable } from '@opentui/core'

import { Tab } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SectionTab(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  position: SidebarPosition
  label: string
  count?: number
  disabled?: boolean
  selected: boolean
  onActivate: () => void
}) {
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id,
    position: () => props.position,
    disabled: () => props.disabled === true,
    activate: props.onActivate,
  })
  const focused = () => item.focused()

  return (
    <Tab
      api={props.api}
      selected={props.selected}
      focused={!props.disabled && focused()}
      count={props.count}
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.id}
      height={1}
      minWidth={0}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={item.backgroundColor()}
      foregroundColor={item.foregroundColor()}
      onMouseOver={props.disabled ? undefined : item.onMouseOver}
      onMouseOut={props.disabled ? undefined : item.onMouseOut}
      onMouseDown={(event) => {
        if (!props.disabled) item.select(event)
      }}
      onMouseUp={(event) => {
        event.stopPropagation()

        if (!props.disabled) item.activate(event)
      }}
    >
      {props.label}
    </Tab>
  )
}
