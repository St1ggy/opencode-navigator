import type { QuotaWindow } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaWindowRow(props: { api: TuiPluginApi; window: QuotaWindow }) {
  const kind = () =>
    props.window.kind === 'rate_limit' ? 'API · ' : props.window.kind === 'configured_limit' ? 'Limit · ' : ''
  const measurement = () => {
    if (props.window.used !== undefined)
      return `${props.window.used}${props.window.total === undefined ? '' : `/${props.window.total}`}${props.window.unit === '%' ? '' : ' '}${props.window.unit} used`

    if (props.window.remaining !== undefined) return `${props.window.remaining} ${props.window.unit} remaining`

    return `${props.window.total} ${props.window.unit} capacity · usage unknown`
  }

  return (
    <box>
      <text fg={props.api.theme.current.text} wrapMode="none" truncate>
        {kind()}
        {props.window.label}
        {props.window.durationMinutes === undefined ? '' : ` · ${props.window.durationMinutes} min`}
      </text>
      <text fg={props.api.theme.current.text} wrapMode="word">
        {measurement()}
      </text>
      <text fg={props.api.theme.current.textMuted} wrapMode="word">
        {props.window.resetsAt === undefined
          ? 'Reset time unavailable'
          : `resets ${new Date(props.window.resetsAt * 1000).toLocaleString()}`}
      </text>
    </box>
  )
}
