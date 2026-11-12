import { Show, createSignal } from 'solid-js'

import { resetCreditView } from '../../model/reset-credit-view'

import { GuiResetCreditExpiry } from './reset-credit-expiry'

import type { BankedResetCredit } from '../../../../entities/provider-limit/model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiResetCreditCard(props: {
  ui: Ui
  credit: BankedResetCredit
  now: number
  disabled: boolean
  review(): void
}) {
  const Icon = props.ui.Icon
  const Button = props.ui.Button
  const [details, setDetails] = createSignal(false)
  const view = () => resetCreditView(props.credit, props.now)

  return (
    <li
      data-reset-credit-card
      aria-label={`${view().title} · ${view().status}`}
      style={{
        border: '1px solid var(--v2-border-border-base)',
        'border-radius': '12px',
        padding: '12px',
        display: 'grid',
        gap: '12px',
        'min-width': '0',
        'overflow-wrap': 'anywhere',
      }}
    >
      <header style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'flex-wrap': 'wrap' }}>
        <span aria-hidden="true">
          <Icon name="reset" />
        </span>
        <strong style={{ flex: '1', 'min-width': '0' }}>{view().title}</strong>
        <span
          style={{ display: 'inline-flex', 'align-items': 'center', gap: '4px', color: 'var(--v2-text-text-muted)' }}
        >
          <span aria-hidden="true">
            <Icon name={view().canReview ? 'circle-check' : 'info'} size="small" />
          </span>
          {view().status}
        </span>
      </header>
      <GuiResetCreditExpiry ui={props.ui} credit={props.credit} now={props.now} />
      <Show when={details()}>
        <p style={{ margin: '0', color: 'var(--v2-text-text-muted)' }}>{props.credit.description}</p>
      </Show>
      <footer style={{ display: 'flex', gap: '8px', 'justify-content': 'space-between', 'flex-wrap': 'wrap' }}>
        <Show when={props.credit.description} fallback={<span />}>
          <Button size="small" variant="ghost-muted" icon="info" onClick={() => setDetails(!details())}>
            {details() ? 'Hide details' : 'Provider details'}
          </Button>
        </Show>
        <Button size="small" icon="arrow-right" disabled={props.disabled || !view().canReview} onClick={props.review}>
          Review credit
        </Button>
      </footer>
    </li>
  )
}
