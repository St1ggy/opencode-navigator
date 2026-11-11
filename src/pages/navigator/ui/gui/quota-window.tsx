import { quotaPresentation } from '../../../../features/provider-limits/model'

import type { QuotaWindow } from '../../../../entities/provider-limit/model'

export function GuiQuotaWindow(props: { window: QuotaWindow }) {
  const view = () => quotaPresentation(props.window)

  return (
    <div aria-label={props.window.label} style={{ 'min-width': '0', margin: '12px 0' }}>
      <div
        role="meter"
        aria-label={props.window.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={view().ratio === undefined ? undefined : Math.round(view().ratio! * 100)}
        aria-valuetext={view().value}
        style={{ height: '2px', background: 'color-mix(in srgb, currentColor 10%, transparent)' }}
      >
        <div
          style={{ height: '100%', width: `${(view().ratio ?? 0) * 100}%`, background: 'currentColor', opacity: 0.5 }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', 'font-size': '12px', 'margin-top': '5px' }}>
        <span
          style={{ opacity: 0.6, overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap', flex: '1' }}
        >
          {view().reset}
        </span>
        <span style={{ 'flex-shrink': '0' }}>{view().value}</span>
      </div>
    </div>
  )
}
