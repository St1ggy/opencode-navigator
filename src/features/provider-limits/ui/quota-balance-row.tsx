import type { QuotaBalance } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaBalanceRow(props: { api: TuiPluginApi; balance: QuotaBalance }) {
  return (
    <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
      <span style={{ fg: props.api.theme.current.text }}>
        {props.balance.unlimited
          ? 'No configured cap'
          : `${props.balance.amount} ${props.balance.unit ?? '(provider unit not specified)'}`}
      </span>
      {` · ${props.balance.scope} · ${props.balance.label}`}
    </text>
  )
}
