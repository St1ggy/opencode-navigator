import { createEffect, createSignal, on } from 'solid-js'

import { SelectionBox } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export type SectionHeaderAction = {
  id: string
  label: () => string
  disabled: () => boolean
  onActivate: () => void
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

function truncateEnd(value: string, width: number) {
  if (Bun.stringWidth(value) <= width) return value

  if (width <= 0) return ''

  const ellipsis = width >= 3 ? '...' : '.'.repeat(width)
  let result = ''

  for (const { segment } of graphemes.segment(value)) {
    if (Bun.stringWidth(result + segment) > width - ellipsis.length) break

    result += segment
  }

  return result + ellipsis
}

export function SectionHeaderControl(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  action: SectionHeaderAction
  position: SidebarPosition
  iconOnly?: boolean
  resetWidth?: number
}) {
  const [width, setWidth] = createSignal<number>()
  const control = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: props.action.id,
      position: () => props.position,
      disabled: props.action.disabled,
      activate: props.action.onActivate,
    },
    () => props.api.theme.current.accent,
    'control',
  )

  createEffect(
    on(
      () => [props.action.label(), props.resetWidth],
      () => setWidth(undefined),
    ),
  )
  const label = () =>
    width() === undefined || props.iconOnly ? props.action.label() : truncateEnd(props.action.label(), width()! - 2)

  return (
    <SelectionBox
      ref={(node: BoxRenderable) => control.ref(node)}
      id={props.action.id}
      iconOnly={props.iconOnly}
      width={props.iconOnly ? 3 : undefined}
      flexShrink={props.iconOnly ? 0 : 1}
      minWidth={3}
      overflow="hidden"
      alignItems={props.iconOnly ? 'center' : undefined}
      backgroundColor={control.backgroundColor()}
      onSizeChange={function (this: BoxRenderable) {
        setWidth(this.width)
      }}
      onMouseOver={control.onMouseOver}
      onMouseOut={control.onMouseOut}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => {
        event.stopPropagation()
        control.activate(event)
      }}
    >
      <text fg={control.foregroundColor()} wrapMode="none" height={1}>
        {label()}
      </text>
    </SelectionBox>
  )
}
