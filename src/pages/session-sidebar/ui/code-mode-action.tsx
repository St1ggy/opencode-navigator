import { SelectionBox } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { RGBA } from '@opentui/core'
import type { JSX } from 'solid-js'

export function CodeModeAction(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  position: SidebarPosition
  id: string
  label?: string
  width?: number
  render?(foreground: RGBA, focused: boolean): JSX.Element
  disabled?: boolean
  activate(): void
}) {
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id,
    position: () => props.position,
    disabled: () => props.disabled === true,
    activate: props.activate,
  })

  return (
    <SelectionBox
      id={props.id}
      ref={item.ref}
      minWidth={0}
      width={props.width}
      height={props.render ? undefined : 1}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => {
        event.stopPropagation()
        item.select(event)
      }}
      onMouseUp={(event) => {
        event.stopPropagation()
        item.activate(event)
      }}
    >
      {props.render?.(item.foregroundColor(), item.focused()) ?? (
        <text fg={item.foregroundColor()} wrapMode="none" truncate>
          {props.label}
        </text>
      )}
    </SelectionBox>
  )
}
