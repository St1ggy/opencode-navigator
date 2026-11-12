import { createSignal } from 'solid-js'

import { GuiQuotaMeter, GuiResetTimeRow, quotaColors } from '../../../../features/provider-limits/gui'
import { quotaPresentation } from '../../../../features/provider-limits/model'

import type { QuotaWindow } from '../../../../entities/provider-limit/model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiQuotaWindow(props: { ui: Pick<Ui, 'Icon' | 'Button'>; window: QuotaWindow; now: number }) {
  const [absolute, setAbsolute] = createSignal(false)
  const Icon = props.ui.Icon
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
      style={{ display: 'grid', gap: '1px', 'min-width': '0', margin: '12px 0' }}
    >
      <GuiQuotaMeter
        icon={<Icon name="monitor" size="small" />}
        label={props.window.label}
        labelAbove
        name={props.window.label}
        value={view().compactValue}
        ratio={view().ratio}
        color={color()}
      />
      <GuiQuotaMeter
        label={absolute() ? view().absoluteReset : view().relativeReset}
        name={`Time remaining · ${props.window.label}`}
        value={view().period.ratio === undefined ? '' : view().period.detail}
        ratio={view().period.ratio}
        color={quotaColors.blue}
        row={
          <GuiResetTimeRow
            ui={props.ui}
            label={absolute() ? view().absoluteReset : view().relativeReset}
            value={view().period.ratio === undefined ? '' : view().period.detail}
            absolute={absolute()}
            disabled={!view().canToggleReset}
            onToggle={() => setAbsolute((value) => !value)}
          />
        }
      />
    </div>
  )
}
