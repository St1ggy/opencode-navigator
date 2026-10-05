import type { QuotaWindow } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaWindowRow(props: { api: TuiPluginApi; window: QuotaWindow }) {
  const reset = () =>
    props.window.resetsAt === undefined ? '' : ` · resets ${new Date(props.window.resetsAt * 1000).toLocaleString()}`

  return (
    <box>
      <text fg={props.api.theme.current.text} wrapMode="none" truncate>
        {props.window.durationMinutes === undefined ? props.window.label : `${props.window.durationMinutes} min`}:{' '}
        {props.window.used}
        {props.window.total === undefined ? '' : `/${props.window.total}`}
        {props.window.unit} used
      </text>
      <text fg={props.api.theme.current.textMuted} wrapMode="word">
        {reset().replace(' · ', '') || 'Reset time unavailable'}
      </text>
    </box>
  )
}
