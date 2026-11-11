import { randomUUID } from 'node:crypto'

import { GuardedConfirmation, useDialogState } from '../../../shared/ui'
import { resetCreditOutcomeMessage } from '../model/reset-credit-message'
import { createResetCreditModel } from '../model/reset-credit-model'

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
  const model = createResetCreditModel({
    preferences: input.preferences,
    adapter: input.adapter,
    model: input.model,
    current: input.current,
    signal,
    busy,
    setBusy,
    id: randomUUID,
    now: Date.now,
    refresh: () => input.controller.refresh(true),
  })

  async function consume(creditID?: string) {
    try {
      const outcome = await model.consume(creditID)

      if (!outcome) return

      input.api.ui.toast({
        variant: outcome === 'reset' || outcome === 'alreadyRedeemed' ? 'success' : 'info',
        title: 'Codex reset credit',
        message: resetCreditOutcomeMessage[outcome],
      })

      if (input.current()) input.dialogs.close()
    } catch (error) {
      if (input.current()) {
        warn(`${error instanceof Error ? error.message : 'Reset request failed'} · retry keeps the same attempt`)
        input.dialogs.back()
      }
    }
  }

  async function review(creditID?: string) {
    try {
      const snapshot = await model.review(creditID)

      if (!snapshot) return

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
    }
  }

  return { review, consume, busy }
}
