import { For, Show } from 'solid-js'

import { createQuotaClock } from '../../../../features/provider-limits/gui'
import { canLinkCodexAccount, quotaStatusMessage } from '../../../../features/provider-limits/model'
import { GuiIconAction } from '../../../../shared/ui/gui'

import { useNavigatorGui } from './context'
import { GuiQuotaWindow } from './quota-window'
import { MonitoringSection } from './section'

export function LimitsSection() {
  const props = useNavigatorGui()
  const now = createQuotaClock()
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
          showUpdatedAt: true,
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
              Banked Resets{snapshot()?.bankedResets ? ` (${snapshot()!.bankedResets!.availableCount})` : ''}
            </Button>
          </Show>
          <GuiIconAction
            ui={props.ui}
            icon="refresh"
            label="Refresh"
            onClick={() => void limits()?.controller.refresh(true)}
          />
        </>
      }
    >
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
            <For each={value().windows.map((window) => window.id)}>
              {(_, index) => <GuiQuotaWindow window={value().windows[index()]} now={now()} />}
            </For>
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
