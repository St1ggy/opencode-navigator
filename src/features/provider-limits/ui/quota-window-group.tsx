import { For } from 'solid-js'

import { useIcons } from '../../../shared/ui'

import { QuotaWindowRow } from './quota-window-row'

import type { QuotaWindow } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaWindowGroup(props: { api: TuiPluginApi; windows: readonly QuotaWindow[] }) {
  const icons = useIcons()
  const guide = () =>
    Array.from({ length: Math.max(0, props.windows.length * 3 - 1) }, () =>
      icons.style() === 'text' ? '|' : '│',
    ).join('\n')

  return (
    <box width="100%" minWidth={0} flexDirection="row" overflow="hidden">
      <text width={1} marginRight={1} flexShrink={0} fg={props.api.theme.current.textMuted} wrapMode="none">
        {guide()}
      </text>
      <box width="100%" flexGrow={1} flexShrink={1} minWidth={0} gap={1}>
        <For each={props.windows}>{(window) => <QuotaWindowRow api={props.api} window={window} />}</For>
      </box>
    </box>
  )
}
