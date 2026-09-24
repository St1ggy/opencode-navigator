import { TextAttributes } from '@opentui/core'
import { Show } from 'solid-js'

import { SIDEBAR_SECTIONS, type SidebarSection } from '../../../entities/sidebar-layout'
import { SelectionBox } from '../../../shared/ui'

import type { PreferencesController } from '../../../entities/preferences'
import type { SettingsDialogController } from '../model/settings-dialog-controller'

export function SettingsOptionRow(props: {
  preferences: PreferencesController
  controller: SettingsDialogController
  option: { title: string; value: string; description: string }
}) {
  const model = props.controller
  const index = () => model.options().findIndex((candidate) => candidate.value === props.option.value)
  const selected = () => model.active() === index()
  const section = () => props.option.value as SidebarSection

  return (
    <SelectionBox
      id={model.optionId(props.option.value)}
      flexDirection="row"
      gap={2}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={selected() ? model.theme().backgroundElement : undefined}
      onMouseOver={() => model.setActive(index())}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => {
        event.stopPropagation()
        model.select(props.option.value)
      }}
    >
      <text flexShrink={0} attributes={selected() ? TextAttributes.BOLD : undefined} fg={model.theme().text}>
        {props.option.title}
      </text>
      <text flexGrow={1} fg={model.theme().borderSubtle}>
        {props.option.description}
      </text>
      <Show when={SIDEBAR_SECTIONS.includes(section())}>
        <box flexDirection="row" flexShrink={0} gap={1}>
          <Show when={props.option.value === 'quick_actions'}>
            <text
              fg={model.theme().accent}
              onMouseDown={(event) => event.stopPropagation()}
              onMouseUp={(event) => {
                event.stopPropagation()
                model.openQuickActions()
              }}
            >
              {model.icons.icon('actions')} Actions
            </text>
          </Show>
          <Show when={props.option.value === 'mcp'}>
            <text
              fg={model.theme().accent}
              onMouseDown={(event) => event.stopPropagation()}
              onMouseUp={(event) => {
                event.stopPropagation()
                model.openMcpGroups()
              }}
            >
              {model.icons.icon('sections')} Groups
            </text>
          </Show>
          <text
            fg={model.theme().accent}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => {
              event.stopPropagation()
              model.openLimitPrompt(section())
            }}
          >
            {model.icons.icon('todo')} Items: {props.preferences.selectedSectionItemLimit?.(section()) || 'All'}
          </text>
          <text
            fg={model.theme().accent}
            onMouseDown={(event) => {
              event.stopPropagation()
              model.reorder(props.option.value, -1)
            }}
          >
            {model.icons.icon('up')}
          </text>
          <text
            fg={model.theme().accent}
            onMouseDown={(event) => {
              event.stopPropagation()
              model.reorder(props.option.value, 1)
            }}
          >
            {model.icons.icon('down')}
          </text>
        </box>
      </Show>
    </SelectionBox>
  )
}
