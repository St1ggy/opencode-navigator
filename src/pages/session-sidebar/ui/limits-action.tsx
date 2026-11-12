import { Show } from 'solid-js'

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
  inline?: boolean
  flexGrow?: number
  maxWidth?: number
  trailingLabel?: string
  fullWidth?: boolean
}) {
  const item = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: props.id,
      position: () => props.position,
      disabled: () => props.disabled === true,
      activate: props.onActivate,
    },
    () => props.api.theme.current.text,
    props.inline ? 'control' : 'row',
  )

  return (
    <SelectionBox
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.id}
      height={1}
      width={props.fullWidth ? '100%' : undefined}
      flexDirection="row"
      flexGrow={props.flexGrow}
      maxWidth={props.maxWidth}
      flexShrink={1}
      minWidth={3}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseUp={(event) => {
        event.stopPropagation()
        item.activate(event)
      }}
    >
      <text fg={item.foregroundColor()} flexGrow={1} minWidth={0} wrapMode="none" truncate>
        {props.label}
      </text>
      <Show when={props.trailingLabel}>
        <text fg={item.foregroundColor()} flexShrink={0}>
          {props.trailingLabel}
        </text>
      </Show>
    </SelectionBox>
  )
}
