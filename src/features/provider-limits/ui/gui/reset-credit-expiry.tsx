import { Show } from 'solid-js'

import { resetCreditLifetime } from '../../../../entities/provider-limit/model'

import type { BankedResetCredit } from '../../../../entities/provider-limit/model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiResetCreditExpiry(props: { ui: Ui; credit: BankedResetCredit; now: number }) {
  const Icon = props.ui.Icon
  const lifetime = () => resetCreditLifetime(props.credit, props.now)
  const expiry = () => {
    const timestamp = props.credit.expiresAt

    if (timestamp === undefined || timestamp <= 0) return

    const date = new Date(timestamp * 1000)

    return Number.isFinite(date.getTime()) ? date : undefined
  }

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <span style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
        <span aria-hidden="true">
          <Icon name="outline-reset" size="small" />
        </span>
        {lifetime().label}
      </span>
      <Show when={lifetime().remaining !== undefined}>
        <div
          role="progressbar"
          aria-label={`Time remaining for ${props.credit.title || `Credit ${props.credit.id}`}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((lifetime().remaining ?? 0) * 100)}
          aria-valuetext={lifetime().label}
          style={{
            height: '4px',
            overflow: 'hidden',
            'border-radius': '2px',
            background: 'var(--v2-border-border-base)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--v2-text-text-base)',
              transform: `scaleX(${lifetime().remaining ?? 0})`,
              'transform-origin': 'left',
            }}
          />
        </div>
      </Show>
      <Show when={expiry()}>
        {(date) => (
          <time dateTime={date().toISOString()} style={{ color: 'var(--v2-text-text-muted)' }}>
            Expires {date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </time>
        )}
      </Show>
      <Show when={lifetime().remaining === undefined && expiry()}>
        <span style={{ color: 'var(--v2-text-text-muted)' }}>Grant date unavailable or invalid; progress unknown</span>
      </Show>
    </div>
  )
}
