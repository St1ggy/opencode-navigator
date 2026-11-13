import { quotaBalanceValue } from '../model/balance-value'

import type { QuotaBalance } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaBalanceRow(props: { api: TuiPluginApi; balance: QuotaBalance }) {
  return (
    <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
      {`${props.balance.label}: `}
      <span style={{ fg: props.api.theme.current.text }}>{quotaBalanceValue(props.balance)}</span>
    </text>
  )
}
