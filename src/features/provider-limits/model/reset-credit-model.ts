import type { PendingResetAttempt, PreferencesController } from '../../../entities/preferences/model'
import type { ProviderQuotaAdapter, SelectedModel } from '../../../entities/provider-limit/model'

export function resetAttemptMatches(model: SelectedModel, attempt: PendingResetAttempt) {
  return (
    attempt.accountID === model.accountID &&
    attempt.modelID === model.modelID &&
    attempt.providerID === model.providerID &&
    (attempt.connectionID === undefined || attempt.connectionID === model.hostConnection?.id)
  )
}

export function createResetCreditModel(input: {
  preferences: Pick<PreferencesController, 'pendingResetAttempt' | 'beginResetAttempt' | 'finishResetAttempt'>
  adapter: ProviderQuotaAdapter
  model: SelectedModel
  current(): boolean
  signal(): AbortSignal
  busy(): boolean
  setBusy(value: boolean): void
  id(): string
  now(): number
  refresh(): Promise<unknown>
}) {
  async function consume(creditID?: string) {
    if (input.busy() || !input.current() || !input.model.accountID || !input.adapter.consumeResetCredit) return

    input.setBusy(true)
    const previous = input.preferences.pendingResetAttempt()
    const attempt = previous ?? {
      providerID: input.model.providerID,
      modelID: input.model.modelID,
      accountID: input.model.accountID,
      ...(creditID && { creditID }),
      idempotencyKey: input.id(),
      createdAt: input.now(),
      ...(input.model.hostConnection?.id && { connectionID: input.model.hostConnection.id }),
    }

    try {
      if (!resetAttemptMatches(input.model, attempt))
        throw new Error('Resolve the earlier attempt on its linked account and model first')

      if (!previous) await input.preferences.beginResetAttempt(attempt)

      if (!input.current()) return

      const outcome = await input.adapter.consumeResetCredit(
        input.model,
        { ...attempt, uncertain: Boolean(previous) },
        input.signal(),
      )

      await input.preferences.finishResetAttempt(attempt.idempotencyKey)
      await input.refresh()

      return outcome
    } finally {
      input.setBusy(false)
    }
  }

  async function review(creditID?: string) {
    if (
      input.busy() ||
      !input.current() ||
      !input.adapter.prepareResetCreditConsumption ||
      !input.adapter.consumeResetCredit
    )
      return

    input.setBusy(true)
    try {
      const snapshot = await input.adapter.prepareResetCreditConsumption(input.model, creditID, input.signal())

      if (!input.current() || snapshot.accountId !== input.model.accountID) return

      return snapshot
    } finally {
      input.setBusy(false)
    }
  }

  return { review, consume, busy: input.busy }
}
