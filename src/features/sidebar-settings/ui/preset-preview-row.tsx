import { TextAttributes } from '@opentui/core'

import { SelectionBox, useIcons } from '../../../shared/ui'

import type { UiIcon } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function PresetPreviewRow(props: {
  api: TuiPluginApi
  icon: string
  title: string
  description: string
  status: 'changed' | 'skipped' | 'unchanged'
  statusIcon: UiIcon
  statusLabel: string
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const emphasized = () => props.status !== 'unchanged'
  const statusColor = () =>
    props.status === 'changed' ? theme().accent : props.status === 'skipped' ? theme().warning : theme().textMuted

  return (
    <SelectionBox
      backgroundColor={emphasized() ? theme().backgroundElement : theme().backgroundPanel}
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="row" gap={1}>
        <text flexShrink={0} fg={statusColor()}>
          {props.icon}
        </text>
        <text
          flexGrow={1}
          fg={emphasized() ? theme().text : theme().textMuted}
          attributes={emphasized() ? TextAttributes.BOLD : undefined}
          wrapMode="none"
          truncate
          height={1}
        >
          {props.title}
        </text>
        <text flexShrink={0} fg={statusColor()} attributes={emphasized() ? TextAttributes.BOLD : undefined}>
          {icons.icon(props.statusIcon)} {props.statusLabel}
        </text>
      </box>
      <text fg={theme().textMuted} wrapMode="none" truncate height={1}>
        {icons.icon('right')} {props.description}
      </text>
    </SelectionBox>
  )
}
