import type { QuotaBalance } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaBalanceRow(props: { api: TuiPluginApi; balance: QuotaBalance }) {
  return (
    <box>
      <text fg={props.api.theme.current.textMuted} wrapMode="word">
        {props.balance.label} · {props.balance.scope}
      </text>
      <text fg={props.api.theme.current.text} wrapMode="word">
        {props.balance.unlimited
          ? 'No configured cap'
          : `${props.balance.amount} ${props.balance.unit ?? '(provider unit not specified)'}`}
      </text>
    </box>
  )
}
