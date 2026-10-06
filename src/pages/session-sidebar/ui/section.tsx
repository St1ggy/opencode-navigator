import { type JSX, Show, createSignal } from 'solid-js'

import { SelectionBox, useIcons } from '../../../shared/ui'

import { SectionHeaderControl } from './section-header-control'
import { useSidebarItem } from './sidebar-item'

import type { SectionHeaderAction } from './section-header-control'
import type { SidebarSection } from '../../../entities/sidebar-layout'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

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
  headerControls?: JSX.Element
  open: boolean
  onToggle: () => void
  children: JSX.Element
}

export function Section(props: SectionProps) {
  const icons = useIcons()
  const [headerWidth, setHeaderWidth] = createSignal(0)
  const icon = () => (props.section ? icons.section(props.section) : props.icon)
  const theme = () => props.api.theme.current
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.sectionId ?? `section.${props.title}`,
    position: () => ({ section: props.navigationSection ?? 0, row: 0, column: 0 }),
    activate: props.onToggle,
  })

  return (
    <box gap={1}>
      <SelectionBox
        ref={(node: BoxRenderable) => item.ref(node)}
        id={props.sectionId}
        flexDirection="row"
        height={1}
        justifyContent="space-between"
        gap={1}
        backgroundColor={item.backgroundColor()}
        onMouseOver={item.onMouseOver}
        onMouseOut={item.onMouseOut}
        onMouseDown={(event) => item.activate(event)}
        onSizeChange={function (this: BoxRenderable) {
          setHeaderWidth(this.width)
        }}
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
          {props.headerControls}
          <Show when={props.headerAction}>
            {(action) => (
              <SectionHeaderControl
                api={props.api}
                interaction={props.interaction}
                action={action()}
                resetWidth={headerWidth()}
                position={{ section: props.navigationSection ?? 0, row: 0, column: 1 }}
              />
            )}
          </Show>
          <Show when={props.summary}>
            <text
              fg={item.focused() ? item.foregroundColor() : theme().textMuted}
              flexShrink={props.headerAction ? 0 : 1}
              wrapMode="none"
              truncate
              height={1}
            >
              {props.summary}
            </text>
          </Show>
        </box>
      </SelectionBox>
      <Show when={props.open}>{props.children}</Show>
    </box>
  )
}

export const SectionWithHeaderAction = Section
