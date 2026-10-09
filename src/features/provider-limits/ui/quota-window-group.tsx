import { For } from 'solid-js'

import { QuotaWindowRow } from './quota-window-row'

import type { QuotaWindow } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaWindowGroup(props: { api: TuiPluginApi; windows: readonly QuotaWindow[] }) {
  return (
    <box width="100%" minWidth={0} gap={1} overflow="hidden">
      <For each={props.windows}>{(window) => <QuotaWindowRow api={props.api} window={window} />}</For>
    </box>
  )
}
