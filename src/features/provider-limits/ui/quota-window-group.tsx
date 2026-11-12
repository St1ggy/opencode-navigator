import { For } from 'solid-js'

import { createQuotaClock } from '../model/quota-clock'

import { QuotaWindowRow } from './quota-window-row'

import type { QuotaWindow } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaWindowGroup(props: { api: TuiPluginApi; windows: readonly QuotaWindow[] }) {
  const now = createQuotaClock()

  return (
    <box width="100%" minWidth={0} gap={1} overflow="hidden">
      {/* Fresh snapshots must not discard each row's measured width. */}
      <For each={props.windows.map((window) => window.id)}>
        {(_, index) => <QuotaWindowRow api={props.api} window={props.windows[index()]} now={now()} />}
      </For>
    </box>
  )
}
