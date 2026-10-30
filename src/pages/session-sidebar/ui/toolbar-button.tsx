import { Show, createEffect, createSignal, onCleanup } from 'solid-js'

import { IconControl, SelectionBox, terminalIcon, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { ToolbarServices } from '../model/toolbar-model'

export function ToolbarButton(
  props: ToolbarServices & {
    id: string
    icons: readonly string[]
    text?: string
    width: number
    reason?: string
    row: number
    column: number
    label: string
    onRun(): void
    onDetails(id: string, active: boolean): void
  },
) {
  const icons = useIcons()
  const foreground = () => (props.reason ? props.api.theme.current.textMuted : item.foregroundColor())
  const [hovered, setHovered] = createSignal(false)
  const item = useSidebarItem(
    props.api,
    props.interaction,
    { id: props.id, position: () => ({ section: 0, row: props.row + 1, column: props.column }), activate: props.onRun },
    () => (props.reason ? props.api.theme.current.textMuted : props.api.theme.current.accent),
    'control',
  )
  const content = () =>
    [props.icons.map((icon) => terminalIcon(icon, icons.style())).join(' '), props.text].filter(Boolean).join(' ')

  createEffect(() => props.onDetails(props.id, item.focused() || hovered()))
  onCleanup(() => props.onDetails(props.id, false))

  return (
    <Show
      when={props.width === 3 && props.icons.length === 1 && !props.text}
      fallback={
        <SelectionBox
          id={props.id}
          ref={item.ref}
          width={props.width}
          height={1}
          flexShrink={0}
          alignItems="center"
          justifyContent="center"
          backgroundColor={item.backgroundColor()}
          onMouseOver={(event) => {
            event.stopPropagation()
            item.onMouseOver()
            setHovered(true)
          }}
          onMouseOut={(event) => {
            event.stopPropagation()
            item.onMouseOut()
            setHovered(false)
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            item.activate(event)
          }}
        >
          <text height={1} minWidth={0} maxWidth="100%" truncate wrapMode="none" fg={foreground()}>
            {content()}
          </text>
        </SelectionBox>
      }
    >
      <IconControl
        id={props.id}
        ref={item.ref}
        icon={terminalIcon(props.icons[0] ?? 'bolt', icons.style())}
        backgroundColor={item.backgroundColor()}
        foregroundColor={foreground()}
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
    </Show>
  )
}
