import { For, Show } from 'solid-js'

import { QuotaBalanceRow } from './quota-balance-row'
import { QuotaWindowGroup } from './quota-window-group'

import type { ProviderQuotaSnapshot } from '../../../entities/provider-limit'
import type { ResetTimeRenderer } from './quota-window-row'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaSnapshotRows(props: {
  api: TuiPluginApi
  snapshot: ProviderQuotaSnapshot
  renderResetTime?: ResetTimeRenderer
}) {
  return (
    <>
      <Show when={props.snapshot.windows.length > 0}>
        <QuotaWindowGroup api={props.api} windows={props.snapshot.windows} renderResetTime={props.renderResetTime} />
      </Show>
      <For each={props.snapshot.balances}>{(balance) => <QuotaBalanceRow api={props.api} balance={balance} />}</For>
    </>
  )
}
