import { quotaPresentation } from '../model/quota-presentation'

import { quotaColors } from './quota-colors'
import { QuotaMeter } from './quota-meter'

import type { QuotaWindow } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuotaWindowRow(props: { api: TuiPluginApi; window: QuotaWindow; now: number }) {
  const view = () => quotaPresentation(props.window, props.now)
  const color = () => {
    const pace = view().pace

    return pace === 'normal' ? props.api.theme.current.textMuted : quotaColors[pace]
  }

  return (
    <box width="100%" minWidth={0} flexShrink={1} height={5} overflow="hidden">
      <QuotaMeter
        api={props.api}
        label={view().paceLabel || 'Quota remaining'}
        value={view().value}
        ratio={view().ratio}
        color={color()}
      />
      <QuotaMeter
        api={props.api}
        label={view().period.ratio === undefined ? view().period.detail : 'Time remaining'}
        value={view().period.ratio === undefined ? '' : view().period.detail}
        ratio={view().period.ratio}
        color={quotaColors.blue}
      />
      <text width="100%" height={1} fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
        {view().resetSummary}
      </text>
    </box>
  )
}
