import { For, Show } from 'solid-js'

import { canLinkCodexAccount, quotaStatusMessage } from '../../../../features/provider-limits/model'

import { useNavigatorGui } from './context'
import { GuiQuotaWindow } from './quota-window'
import { MonitoringSection } from './section'

export function LimitsSection() {
  const props = useNavigatorGui()
  const limits = () => props.runtime.limits
  const snapshot = () => limits()?.controller.snapshot()
  const state = () => limits()?.controller.state()
  const message = () =>
    limits()?.selected()
      ? quotaStatusMessage({
          model: limits()?.selected(),
          snapshot: snapshot(),
          state: state() ?? { status: 'idle' },
          hasAdapter: Boolean(limits()?.controller.current().adapter),
          showReadyMessage: true,
        })
      : 'Select a model in chat to view its provider limits.'
  const canLink = () => {
    const model = limits()?.selected()

    return (
      model &&
      props.onLinkAccount &&
      limits()?.codex &&
      model.hostConnection?.status === 'ready' &&
      canLinkCodexAccount(model) &&
      (!model.accountID || (snapshot()?.availability === 'unauthenticated' && model.accountSource === 'binding'))
    )
  }
  const Button = props.ui.Button

  return (
    <MonitoringSection
      id="limits"
      title="Limits"
      actions={
        <>
          <Show
            when={
              props.onBankedResets &&
              ((snapshot()?.bankedResets?.availableCount ?? 0) > 0 ||
                props.runtime.catalogs?.preferences.pendingResetAttempt())
            }
          >
            <Button size="small" variant="ghost" onClick={props.onBankedResets}>
              Banked Resets
            </Button>
          </Show>
          <Button size="small" variant="ghost-muted" onClick={() => void limits()?.controller.refresh(true)}>
            Refresh
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '4px', 'align-items': 'center', 'min-width': '0' }}>
        <Button size="small" variant="ghost" onClick={() => limits()?.chooseModel()}>
          {limits()?.label() ?? 'Select model'}
        </Button>
        <Show when={limits()?.selected()?.variant}>
          {(variant) => (
            <Button size="small" variant="ghost-muted" onClick={() => limits()?.chooseVariant()}>
              {variant()}
            </Button>
          )}
        </Show>
      </div>
      <Show when={canLink()}>
        <Button size="small" variant="ghost" onClick={props.onLinkAccount}>
          Link Codex account
        </Button>
      </Show>
      <Show when={state()?.error}>
        <p role="alert">{state()?.error?.message}</p>
      </Show>
      <Show when={message()}>
        <p style={{ opacity: 0.65 }}>{message()}</p>
      </Show>
      <Show when={snapshot()}>
        {(value) => (
          <>
            <For each={value().windows}>{(window) => <GuiQuotaWindow window={window} />}</For>
            <For each={value().balances}>
              {(balance) => (
                <p>
                  {balance.label}: {balance.unlimited ? 'Unlimited' : `${balance.amount} ${balance.unit ?? ''}`}
                </p>
              )}
            </For>
          </>
        )}
      </Show>
    </MonitoringSection>
  )
}
