import { type JSX, Show, createEffect, createSignal } from 'solid-js'

import { SelectionBox, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarSection } from '../../../entities/sidebar-layout'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

function truncateEnd(value: string, maxWidth: number) {
  if (Bun.stringWidth(value) <= maxWidth) return value

  if (maxWidth <= 0) return ''

  const ellipsis = maxWidth >= 3 ? '...' : '.'.repeat(maxWidth)
  const contentWidth = maxWidth - Bun.stringWidth(ellipsis)
  let result = ''

  for (const { segment } of graphemes.segment(value)) {
    if (Bun.stringWidth(result + segment) > contentWidth) break

    result += segment
  }

  return result + ellipsis
}

type SectionHeaderAction = {
  id: string
  label: () => string
  disabled: () => boolean
  onActivate: () => void
}

type SectionProps = {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  sectionId?: string
  navigationSection?: number
  title: string
  icon?: string
  section?: SidebarSection
  summary: string
  headerAction?: SectionHeaderAction
  open: boolean
  onToggle: () => void
  children: JSX.Element
}

export function Section(props: SectionProps) {
  const icons = useIcons()
  const [actionWidth, setActionWidth] = createSignal<number>()
  const icon = () => (props.section ? icons.section(props.section) : props.icon)
  const theme = () => props.api.theme.current
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.sectionId ?? `section.${props.title}`,
    position: () => ({ section: props.navigationSection ?? 0, row: 0, column: 0 }),
    activate: props.onToggle,
  })
  const action = props.headerAction
    ? useSidebarItem(
        props.api,
        props.interaction,
        {
          id: props.headerAction.id,
          position: () => ({ section: props.navigationSection ?? 0, row: 0, column: 1 }),
          disabled: props.headerAction.disabled,
          activate: props.headerAction.onActivate,
        },
        () => theme().accent,
        'control',
      )
    : undefined

  createEffect(() => {
    props.headerAction?.label()
    setActionWidth(undefined)
  })

  const actionLabel = () => {
    const label = props.headerAction?.label() ?? ''
    const width = actionWidth()

    return width === undefined ? label : truncateEnd(label, width - 2)
  }

  return (
    <box gap={1}>
      <SelectionBox
        ref={(node: BoxRenderable) => item.ref(node)}
        id={props.sectionId}
        flexDirection="row"
        height={1}
        justifyContent="space-between"
        gap={1}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={item.backgroundColor()}
        onMouseOver={item.onMouseOver}
        onMouseOut={item.onMouseOut}
        onMouseDown={(event) => item.activate(event)}
        onSizeChange={() => setActionWidth(undefined)}
      >
        <text fg={item.foregroundColor()} flexShrink={0} wrapMode="none">
          <span style={{ fg: item.focused() ? item.foregroundColor() : theme().accent }}>
            {icons.icon(props.open ? 'expanded' : 'collapsed')}
          </span>{' '}
          <span style={{ fg: item.focused() ? item.foregroundColor() : theme().accent }}>
            {icon() ? `${icon()} ` : ''}
          </span>
          <b>{props.title}</b>
        </text>
        <box flexDirection="row" gap={1} flexGrow={1} minWidth={0} justifyContent="flex-end">
          <Show when={action}>
            {(control) => (
              <SelectionBox
                ref={(node: BoxRenderable) => control().ref(node)}
                id={props.headerAction?.id}
                flexShrink={1}
                minWidth={3}
                overflow="hidden"
                backgroundColor={control().backgroundColor()}
                onSizeChange={function (this: BoxRenderable) {
                  setActionWidth(this.width)
                }}
                onMouseOver={control().onMouseOver}
                onMouseOut={control().onMouseOut}
                onMouseDown={(event) => event.stopPropagation()}
                onMouseUp={(event) => {
                  event.stopPropagation()
                  control().activate(event)
                }}
              >
                <text fg={control().foregroundColor()} wrapMode="none" height={1}>
                  {actionLabel()}
                </text>
              </SelectionBox>
            )}
          </Show>
          <text
            fg={item.focused() ? item.foregroundColor() : theme().textMuted}
            flexShrink={props.headerAction ? 0 : 1}
            wrapMode="none"
            truncate
            height={1}
          >
            {props.summary}
          </text>
        </box>
      </SelectionBox>
      <Show when={props.open}>{props.children}</Show>
    </box>
  )
}

export const SectionWithHeaderAction = Section
