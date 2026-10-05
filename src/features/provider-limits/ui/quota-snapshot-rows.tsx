import { For } from 'solid-js'

import { QuotaBalanceRow } from './quota-balance-row'
import { QuotaWindowRow } from './quota-window-row'

import type { ProviderQuotaSnapshot } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaSnapshotRows(props: { api: TuiPluginApi; snapshot: ProviderQuotaSnapshot }) {
  return (
    <>
      <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
        {props.snapshot.providerName}
        {props.snapshot.accountId ? ` · ${props.snapshot.accountId}` : ''}
      </text>
      <For each={props.snapshot.windows}>{(window) => <QuotaWindowRow api={props.api} window={window} />}</For>
      <For each={props.snapshot.balances}>{(balance) => <QuotaBalanceRow api={props.api} balance={balance} />}</For>
    </>
  )
}
