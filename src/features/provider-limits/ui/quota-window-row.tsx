import { useIcons } from '../../../shared/ui'
import { quotaPresentation } from '../model/quota-presentation'

import type { QuotaWindow } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaWindowRow(props: { api: TuiPluginApi; window: QuotaWindow }) {
  const icons = useIcons()
  const view = () => quotaPresentation(props.window)
  const scale = () => {
    const ratio = view().ratio

    if (ratio === undefined) return ' · scale unknown'

    const filled = Math.round(ratio * 10)
    const symbols = icons.style() === 'text' ? ['#', '-'] : ['█', '░']

    return ` [${symbols[0].repeat(filled)}${symbols[1].repeat(10 - filled)}]`
  }

  return (
    <box>
      <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
        <span style={{ fg: props.api.theme.current.text }}>{view().value}</span>
        {scale()}
      </text>
      <text fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
        {view().reset}
      </text>
    </box>
  )
}
