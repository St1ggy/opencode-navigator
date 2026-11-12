import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'

import { GuiResetCreditCard } from './reset-credit-card'

import type { PendingResetAttempt } from '../../../../entities/preferences/model'
import type { BankedResets } from '../../../../entities/provider-limit/model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiResetCreditDialog(props: {
  ui: Ui
  credits?: BankedResets
  pending?: PendingResetAttempt
  busy: boolean
  error: string
  reason?: string
  current(): boolean
  review(creditID?: string): void
  reconcile(): void
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const Icon = props.ui.Icon
  const [now, setNow] = createSignal(Date.now())

  onMount(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)

    onCleanup(() => clearInterval(timer))
  })

  createEffect(() => {
    if (!props.current() && !props.busy) props.close()
  })

  return (
    <Dialog
      title="Banked Resets"
      description={`${props.credits?.availableCount ?? 0} available`}
      footer={<Button onClick={props.close}>Close</Button>}
    >
      <p style={{ display: 'flex', 'align-items': 'center', gap: '8px', margin: '0 0 12px' }}>
        <span aria-hidden="true">
          <Icon name="shield" />
        </span>
        Review a credit first. Nothing is used until you confirm.
      </p>
      <Show when={props.reason || props.error}>
        <p role="alert">{props.error || props.reason}</p>
      </Show>
      <Show when={props.pending}>
        <p>
          An earlier attempt is unresolved. Reconciliation reuses its original idempotency key and never creates a new
          attempt.
        </p>
        <Button
          icon="outline-rotate-clockwise"
          busy={props.busy}
          disabled={Boolean(props.reason)}
          onClick={props.reconcile}
        >
          Reconcile pending attempt
        </Button>
      </Show>
      <ul
        aria-label="Reset credits"
        style={{ padding: '0', margin: '0', 'list-style': 'none', display: 'grid', gap: '12px' }}
      >
        <For each={props.credits?.credits}>
          {(credit) => (
            <GuiResetCreditCard
              ui={props.ui}
              credit={credit}
              now={now()}
              disabled={props.busy || Boolean(props.reason || props.pending)}
              review={() => props.review(credit.id)}
            />
          )}
        </For>
      </ul>
      <Show when={(props.credits?.availableCount ?? 0) > (props.credits?.credits?.length ?? 0)}>
        <p>Some credit details were not supplied by the provider.</p>
        <Button
          icon="arrow-right"
          disabled={props.busy || Boolean(props.reason || props.pending)}
          onClick={() => props.review()}
        >
          Review next available credit
        </Button>
      </Show>
      <Show when={props.busy}>
        <p role="status">Verifying the selected account and reset attempt…</p>
      </Show>
    </Dialog>
  )
}
