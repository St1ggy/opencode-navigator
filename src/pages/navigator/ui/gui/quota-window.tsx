import { createSignal } from 'solid-js'

import { GuiQuotaMeter, GuiQuotaMetric, GuiResetTimeRow, quotaColors } from '../../../../features/provider-limits/gui'
import { quotaPresentation } from '../../../../features/provider-limits/model'

import type { QuotaWindow } from '../../../../entities/provider-limit/model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiQuotaWindow(props: { ui: Pick<Ui, 'Icon' | 'Button'>; window: QuotaWindow; now: number }) {
  const [absolute, setAbsolute] = createSignal(false)
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
      title={view().paceLabel || undefined}
      style={{ display: 'grid', gap: '6px', 'min-width': '0', margin: '12px 0' }}
    >
      <GuiQuotaMetric kind="quota" name={`Quota remaining · ${props.window.label}`} value={view().compactValue} />
      <div
        data-navigator-quota-scales
        style={{ 'border-radius': '4px', overflow: 'hidden', display: 'grid', gap: '1px' }}
      >
        <GuiQuotaMeter name={props.window.label} value={view().compactValue} ratio={view().ratio} color={color()} />
        <GuiQuotaMeter
          name={`Time remaining · ${props.window.label}`}
          value={view().period.ratio === undefined ? '' : view().period.detail}
          ratio={view().period.ratio}
          color={quotaColors.blue}
        />
      </div>
      <GuiQuotaMetric
        kind="time"
        name={`Time remaining · ${props.window.label}`}
        value={view().period.ratio === undefined ? 'Unknown' : view().period.detail}
      />
      <GuiResetTimeRow
        ui={props.ui}
        label={absolute() ? view().absoluteReset : view().relativeReset}
        value=""
        absolute={absolute()}
        disabled={!view().canToggleReset}
        onToggle={() => setAbsolute((value) => !value)}
      />
    </div>
  )
}
