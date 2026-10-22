import { TextAttributes } from '@opentui/core'
import { Show } from 'solid-js'

import { SelectionBox, useIcons } from '../../../shared/ui'

import type { UiIcon } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ShortcutKey(props: {
  api: TuiPluginApi
  keyLabel: string
  label: string
  icon: UiIcon
  width: number
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const keyWidth = () => props.keyLabel.length + 2

  return (
    <box width={props.width} height={1} flexDirection="row" gap={1} overflow="hidden">
      <SelectionBox width={keyWidth()} height={1} flexShrink={0} backgroundColor={theme().backgroundElement}>
        <text fg={theme().accent} attributes={TextAttributes.BOLD}>
          {props.keyLabel}
        </text>
      </SelectionBox>
      <box flexDirection="row" gap={1} flexShrink={1} minWidth={0} overflow="hidden">
        <Show when={props.width >= 16}>
          <text fg={theme().textMuted}>{icons.icon(props.icon)}</text>
        </Show>
        <text fg={theme().text} wrapMode="none">
          {props.label}
        </text>
      </box>
    </box>
  )
}
