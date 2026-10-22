import { createEffect, createSignal, onCleanup } from 'solid-js'

import { IconControl, terminalIcon, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { ToolbarServices } from '../model/toolbar-model'

export function ToolbarButton(
  props: ToolbarServices & {
    id: string
    icon: string
    reason?: string
    row: number
    column: number
    label: string
    onRun(): void
    onDetails(id: string, active: boolean): void
  },
) {
  const icons = useIcons()
  const [hovered, setHovered] = createSignal(false)
  const item = useSidebarItem(
    props.api,
    props.interaction,
    { id: props.id, position: () => ({ section: 0, row: props.row + 1, column: props.column }), activate: props.onRun },
    () => (props.reason ? props.api.theme.current.textMuted : props.api.theme.current.accent),
    'control',
  )

  createEffect(() => props.onDetails(props.id, item.focused() || hovered()))
  onCleanup(() => props.onDetails(props.id, false))

  return (
    <IconControl
      id={props.id}
      ref={item.ref}
      icon={terminalIcon(props.icon, icons.style())}
      backgroundColor={item.backgroundColor()}
      foregroundColor={props.reason ? props.api.theme.current.textMuted : item.foregroundColor()}
      onMouseOver={() => {
        item.onMouseOver()
        setHovered(true)
      }}
      onMouseOut={() => {
        item.onMouseOut()
        setHovered(false)
      }}
      onMouseUp={(event) => item.activate(event)}
    />
  )
}
