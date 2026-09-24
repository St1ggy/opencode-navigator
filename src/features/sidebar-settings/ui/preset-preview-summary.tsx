import { For } from 'solid-js'

import { SelectionBox, useIcons } from '../../../shared/ui'

import type { UiIcon } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type PresetPreviewStat = {
  icon: UiIcon
  label: string
  tone: 'accent' | 'muted' | 'warning'
}

export function PresetPreviewSummary(props: { api: TuiPluginApi; stats: PresetPreviewStat[] }) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const color = (tone: PresetPreviewStat['tone']) =>
    tone === 'accent' ? theme().accent : tone === 'warning' ? theme().warning : theme().textMuted

  return (
    <box flexDirection="row" flexWrap="wrap" gap={1}>
      <For each={props.stats}>
        {(stat) => (
          <SelectionBox height={1} backgroundColor={theme().backgroundElement} paddingLeft={1} paddingRight={1}>
            <text fg={color(stat.tone)} wrapMode="none" height={1}>
              {icons.icon(stat.icon)} {stat.label}
            </text>
          </SelectionBox>
        )}
      </For>
    </box>
  )
}
