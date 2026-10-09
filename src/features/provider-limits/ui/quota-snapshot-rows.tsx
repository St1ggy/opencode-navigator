import { For, Show } from 'solid-js'

import { QuotaBalanceRow } from './quota-balance-row'
import { QuotaWindowGroup } from './quota-window-group'

import type { ProviderQuotaSnapshot } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaSnapshotRows(props: { api: TuiPluginApi; snapshot: ProviderQuotaSnapshot }) {
  return (
    <>
      <Show when={props.snapshot.windows.length > 0}>
        <QuotaWindowGroup api={props.api} windows={props.snapshot.windows} />
      </Show>
      <For each={props.snapshot.balances}>{(balance) => <QuotaBalanceRow api={props.api} balance={balance} />}</For>
    </>
  )
}
