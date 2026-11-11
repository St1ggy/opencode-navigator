import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'

import { resetCreditLifetime } from '../../../../entities/provider-limit/model'

import { GuiResetCreditExpiry } from './reset-credit-expiry'

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
      description={`${props.credits?.availableCount ?? 0} available. No credit is used until you confirm.`}
      footer={<Button onClick={props.close}>Close</Button>}
    >
      <Show when={props.reason || props.error}>
        <p role="alert">{props.error || props.reason}</p>
      </Show>
      <Show when={props.pending}>
        <p>
          An earlier attempt is unresolved. Reconciliation reuses its original idempotency key and never creates a new
          attempt.
        </p>
        <Button busy={props.busy} disabled={Boolean(props.reason)} onClick={props.reconcile}>
          Reconcile pending attempt
        </Button>
      </Show>
      <ul style={{ padding: '0', 'list-style': 'none' }}>
        <For each={props.credits?.credits}>
          {(credit) => (
            <li style={{ padding: '8px 0' }}>
              <strong>{credit.title || `Credit ${credit.id}`}</strong>
              <p style={{ opacity: 0.65 }}>
                {credit.status}
                {credit.description ? ` · ${credit.description}` : ''}
              </p>
              <GuiResetCreditExpiry credit={credit} now={now()} />
              <Button
                size="small"
                disabled={
                  props.busy ||
                  Boolean(props.reason || props.pending) ||
                  credit.status !== 'available' ||
                  resetCreditLifetime(credit, now()).expired ||
                  credit.type !== 'codexRateLimits'
                }
                onClick={() => props.review(credit.id)}
              >
                Review credit
              </Button>
            </li>
          )}
        </For>
      </ul>
      <Show when={(props.credits?.availableCount ?? 0) > (props.credits?.credits?.length ?? 0)}>
        <p>Some credit details were not supplied by the provider.</p>
        <Button disabled={props.busy || Boolean(props.reason || props.pending)} onClick={() => props.review()}>
          Review next available credit
        </Button>
      </Show>
      <Show when={props.busy}>
        <p role="status">Verifying the selected account and reset attempt…</p>
      </Show>
    </Dialog>
  )
}
