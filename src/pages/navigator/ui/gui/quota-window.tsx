import { GuiQuotaMeter, quotaColors } from '../../../../features/provider-limits/gui'
import { quotaPresentation } from '../../../../features/provider-limits/model'

import type { QuotaWindow } from '../../../../entities/provider-limit/model'

export function GuiQuotaWindow(props: { window: QuotaWindow; now: number }) {
  const view = () => quotaPresentation(props.window, props.now)
  const color = () => {
    const pace = view().pace

    return pace === 'normal' ? 'color-mix(in srgb, currentColor 50%, transparent)' : quotaColors[pace]
  }

  return (
    <div
      data-navigator-quota-window={props.window.id}
      data-pace={view().pace}
      aria-label={props.window.label}
      style={{ display: 'grid', gap: '10px', 'min-width': '0', margin: '12px 0' }}
    >
      <span style={{ 'font-size': '12px', 'min-height': '16px' }}>{view().paceLabel}</span>
      <GuiQuotaMeter
        label="Quota remaining"
        name={props.window.label}
        value={view().value}
        ratio={view().ratio}
        color={color()}
      />
      <GuiQuotaMeter
        label={view().period.ratio === undefined ? view().period.detail : 'Time remaining'}
        name={`Time remaining · ${props.window.label}`}
        value={view().period.ratio === undefined ? '' : view().period.detail}
        ratio={view().period.ratio}
        color={quotaColors.blue}
      />
      <div
        style={{
          color: 'var(--v2-text-text-muted)',
          'font-size': '11px',
          'min-width': '0',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
          'white-space': 'nowrap',
        }}
        title={view().resetSummary}
      >
        {view().resetSummary}
      </div>
    </div>
  )
}
