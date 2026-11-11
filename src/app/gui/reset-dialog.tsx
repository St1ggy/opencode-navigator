import { createSignal, onCleanup } from 'solid-js'

import { GuiResetCreditDialog } from '../../features/provider-limits/gui'
import {
  createResetCreditModel,
  resetAttemptMatches,
  resetCreditOutcomeMessage,
} from '../../features/provider-limits/model'

import { createSelectedSessionAccess } from './adapters/selected-session'
import { createGuiNotifications } from './notifications'

import type { PreferencesController } from '../../entities/preferences/model'
import type { MonitoringRegistry } from './monitoring-registry'
import type { Context } from '@opencode/plugin/gui'

export function createGuiResetDialog(
  context: Context,
  registry: MonitoringRegistry,
  preferences: PreferencesController,
) {
  const access = createSelectedSessionAccess(() => context.sessions.current())
  const notifications = createGuiNotifications(context)

  return () => {
    const scope = access.capture()
    const limits = registry.active()?.limits

    if (!scope || !limits) return

    const controller = limits.controller
    const model = limits.selected()
    const adapter = controller.current().adapter
    const key = JSON.stringify(model)
    const current = () => access.current(scope) && JSON.stringify(limits.selected()) === key

    context.dialogs.open((dialog) => {
      const abort = new AbortController()
      const [busy, setBusy] = createSignal(false)
      const [confirming, setConfirming] = createSignal(false)
      const [error, setError] = createSignal('')
      let disposed = false

      onCleanup(() => {
        disposed = true
        abort.abort()
      })
      const reset =
        model &&
        adapter &&
        createResetCreditModel({
          preferences,
          adapter,
          model,
          current,
          busy,
          setBusy,
          signal: () => AbortSignal.any([context.signal, abort.signal, controller.targetSignal()]),
          id: () => globalThis.crypto.randomUUID(),
          now: Date.now,
          refresh: () => controller.refresh(true),
        })
      const reason = () => {
        if (!model?.accountID || !adapter?.consumeResetCredit || !adapter.prepareResetCreditConsumption)
          return 'Select the originally linked local Codex account and model to use or reconcile credits.'

        const pending = preferences.pendingResetAttempt()

        return pending && !resetAttemptMatches(model, pending)
          ? 'Resolve the earlier attempt on its linked account and model first.'
          : undefined
      }

      async function review(creditID?: string, reconcile = false) {
        if (!reset || !model || busy() || confirming() || !current() || reason()) return

        const pending = preferences.pendingResetAttempt()

        if (!reconcile && pending) return

        if (reconcile && !pending) return

        setConfirming(true)
        setError('')
        try {
          const snapshot = reconcile ? controller.snapshot() : await reset.review(creditID)

          if (!current() || (!reconcile && !snapshot)) return

          const confirmed = await context.dialogs.confirm({
            title: reconcile ? 'Reconcile the pending reset?' : 'Use one banked reset?',
            description: `Account ${snapshot?.accountId ?? model.accountID} · model ${model.modelID}. ${reconcile ? 'Reuse the original idempotency key; do not create a second attempt.' : 'This may reset other eligible Codex windows.'}`,
            confirm: reconcile ? 'Reconcile attempt' : 'Use one credit',
            cancel: 'Cancel',
            danger: true,
          })

          if (!confirmed || !current()) return

          if (preferences.pendingResetAttempt()?.idempotencyKey !== pending?.idempotencyKey)
            throw new Error('The pending attempt changed. Review it again before submitting.')

          const outcome = await reset.consume(reconcile ? pending?.creditID : creditID)

          if (!outcome || disposed) return

          notifications.show({
            title: 'Codex reset credit',
            message: resetCreditOutcomeMessage[outcome],
            variant: outcome === 'reset' || outcome === 'alreadyRedeemed' ? 'success' : 'info',
          })
          dialog.close()
        } catch (error_) {
          if (!disposed && current())
            setError(
              `${error_ instanceof Error ? error_.message : 'Reset request failed'} · retry keeps the same attempt`,
            )
        } finally {
          if (!disposed) setConfirming(false)
        }
      }

      return (
        <GuiResetCreditDialog
          ui={context.ui}
          current={current}
          close={dialog.close}
          credits={controller.snapshot()?.bankedResets}
          pending={preferences.pendingResetAttempt()}
          busy={busy() || confirming()}
          error={error()}
          reason={reason()}
          review={(id) => void review(id)}
          reconcile={() => void review(undefined, true)}
        />
      )
    })
  }
}
