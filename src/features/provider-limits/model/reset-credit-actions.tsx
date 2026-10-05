import { randomUUID } from 'node:crypto'

import { GuardedConfirmation, useDialogState } from '../../../shared/ui'

import type { PreferencesController } from '../../../entities/preferences'
import type {
  ProviderQuotaAdapter,
  SelectedModel,
  createProviderLimitsController,
} from '../../../entities/provider-limit'
import type { DialogNavigation } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createResetCreditActions(input: {
  api: TuiPluginApi
  preferences: PreferencesController
  controller: ReturnType<typeof createProviderLimitsController>
  adapter: ProviderQuotaAdapter
  model: SelectedModel
  dialogs: DialogNavigation
  current: () => boolean
}) {
  const [busy, setBusy] = useDialogState('credit-busy', false)
  const signal = input.controller.targetSignal
  const warn = (message: string) => input.api.ui.toast({ variant: 'warning', title: 'Codex reset credit', message })

  async function consume(creditID?: string) {
    if (busy() || !input.current() || !input.model.accountID || !input.adapter.consumeResetCredit) return

    setBusy(true)
    const previous = input.preferences.pendingResetAttempt()
    const attempt = previous ?? {
      providerID: input.model.providerID,
      modelID: input.model.modelID,
      accountID: input.model.accountID,
      ...(creditID && { creditID }),
      idempotencyKey: randomUUID(),
      createdAt: Date.now(),
      ...(input.model.hostConnection?.id && { connectionID: input.model.hostConnection.id }),
    }

    try {
      if (
        attempt.accountID !== input.model.accountID ||
        attempt.modelID !== input.model.modelID ||
        attempt.providerID !== input.model.providerID ||
        (attempt.connectionID !== undefined && attempt.connectionID !== input.model.hostConnection?.id)
      ) {
        throw new Error('Resolve the earlier attempt on its linked account and model first')
      }

      if (!previous) await input.preferences.beginResetAttempt(attempt)

      if (!input.current()) return

      const outcome = await input.adapter.consumeResetCredit(
        input.model,
        { ...attempt, uncertain: Boolean(previous) },
        signal(),
      )

      await input.preferences.finishResetAttempt(attempt.idempotencyKey)
      await input.controller.refresh(true)
      input.api.ui.toast({
        variant: outcome === 'reset' || outcome === 'alreadyRedeemed' ? 'success' : 'info',
        title: 'Codex reset credit',
        message: {
          reset: 'Reset applied. Restart or continue your Codex session.',
          alreadyRedeemed: 'This attempt was already redeemed; no second credit was used.',
          noCredit: 'No reset credit is available.',
          nothingToReset: 'There is no eligible usage window to reset.',
        }[outcome],
      })

      if (input.current()) input.dialogs.close()
    } catch (error) {
      if (input.current()) {
        warn(`${error instanceof Error ? error.message : 'Reset request failed'} · retry keeps the same attempt`)
        input.dialogs.back()
      }
    } finally {
      setBusy(false)
    }
  }

  async function review(creditID?: string) {
    if (busy() || !input.current() || !input.adapter.prepareResetCreditConsumption || !input.adapter.consumeResetCredit)
      return

    setBusy(true)
    try {
      const snapshot = await input.adapter.prepareResetCreditConsumption(input.model, creditID, signal())

      if (!input.current() || snapshot.accountId !== input.model.accountID) return

      input.dialogs.open(() => (
        <GuardedConfirmation
          api={input.api}
          current={input.current}
          title="Use one banked reset?"
          message={`Account ${snapshot.accountId} · model ${input.model.modelID}. This may reset other eligible Codex windows.`}
          onConfirm={() => void consume(creditID)}
        />
      ))
    } catch (error) {
      if (input.current()) warn(error instanceof Error ? error.message : 'Credit eligibility is unavailable')
    } finally {
      setBusy(false)
    }
  }

  return { review, consume, busy }
}
