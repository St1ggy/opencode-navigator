import { TextAttributes } from '@opentui/core'
import { For } from 'solid-js'

import { SECTION_DEFINITIONS } from '../../../entities/sidebar-layout'
import { supportsSidebarSection } from '../../../shared/lib/host-capabilities'
import { SelectionBox, useIcons } from '../../../shared/ui'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SectionConfig(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  active: number
  onActive: (index: number) => void
  onBack: () => void
  onFinish: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const sections = SECTION_DEFINITIONS.filter((section) => supportsSidebarSection(props.api, section.name))
  const finishIndex = sections.length

  return (
    <box gap={1}>
      <text fg={theme().accent} attributes={TextAttributes.BOLD}>
        {icons.icon('sections')} Choose your sidebar sections
      </text>
      <text fg={theme().textMuted} wrapMode="word">
        Select what appears now. You can change visibility, order, limits, scope, and presets later with the gear
        button.
      </text>
      <For each={sections}>
        {(section, index) => (
          <SelectionBox
            flexDirection="row"
            gap={1}
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={props.active === index() ? theme().backgroundElement : undefined}
            onMouseOver={() => props.onActive(index())}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => {
              event.stopPropagation()
              props.preferences.toggleSection(section.name)
            }}
          >
            <text flexShrink={0} fg={props.preferences.sections()[section.name] ? theme().accent : theme().textMuted}>
              {icons.icon(props.preferences.sections()[section.name] ? 'checked' : 'unchecked')}
            </text>
            <text fg={props.active === index() ? theme().text : theme().textMuted}>
              {icons.section(section.name)} {section.label}
            </text>
          </SelectionBox>
        )}
      </For>
      <box flexDirection="row" justifyContent="space-between">
        <SelectionBox
          paddingLeft={1}
          paddingRight={1}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            props.onBack()
          }}
        >
          <text fg={theme().textMuted}>{icons.icon('left')} Back</text>
        </SelectionBox>
        <SelectionBox
          paddingLeft={2}
          paddingRight={2}
          backgroundColor={props.active === finishIndex ? theme().primary : undefined}
          onMouseOver={() => props.onActive(finishIndex)}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            props.onFinish()
          }}
        >
          <text fg={props.active === finishIndex ? theme().selectedListItemText : theme().textMuted}>
            {icons.icon('done')} Finish
          </text>
        </SelectionBox>
      </box>
    </box>
  )
}
