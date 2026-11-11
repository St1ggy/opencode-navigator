import { createCodexQuotaAdapter, resetAttemptMatches } from '../../../features/provider-limits/model'

import { createMainCodexModel } from './main-codex-model'

import type { PreferencesStore } from '../../../entities/preferences/model'
import type { ProviderQuotaAdapter } from '../../../entities/provider-limit/model'
import type { CodexRpcClient } from '../../../features/provider-limits/model'
import type { MainCodexTarget } from './main-codex-model'
import type { MainContext } from '@opencode/plugin/gui/main'

export function createMainCodexHandlers(context: MainContext, store: PreferencesStore, client: CodexRpcClient) {
  type Outcome = Awaited<ReturnType<NonNullable<ProviderQuotaAdapter['consumeResetCredit']>>>
  const consumptions = new Map<string, Promise<Outcome>>()
  const resolve = createMainCodexModel(context, store)
  const signal = (caller: { signal: AbortSignal }) =>
    AbortSignal.any([context.signal, caller.signal, AbortSignal.timeout(15_000)])

  async function capture(target: MainCodexTarget, currentSignal: AbortSignal) {
    const model = await resolve(target, currentSignal)
    const adapter = createCodexQuotaAdapter(client, async (expected, validationSignal) => {
      const actual = await resolve(target, validationSignal)

      return actual.accountID === expected.accountID && actual.hostConnection?.id === expected.hostConnection?.id
    })

    return { model, adapter }
  }

  return {
    async discover(target: MainCodexTarget, caller: { signal: AbortSignal }) {
      const currentSignal = signal(caller)
      const { model, adapter } = await capture(target, currentSignal)
      const accountID = await adapter.discoverAccount!(currentSignal)
      const current = await resolve(target, currentSignal)

      if (
        current.hostConnection?.id !== model.hostConnection?.id ||
        (current.hostConnection?.accountID && current.hostConnection.accountID !== accountID)
      )
        throw new Error('The local Codex account does not match the selected OpenCode connection')

      return { accountID, connectionID: current.hostConnection!.id! }
    },
    async read(target: MainCodexTarget, caller: { signal: AbortSignal }) {
      const currentSignal = signal(caller)
      const { model, adapter } = await capture(target, currentSignal)

      if (!model.accountID)
        return JSON.stringify({
          model,
          providerId: 'codex',
          providerName: 'Codex CLI',
          fetchedAt: Date.now(),
          windows: [],
          availability: 'setup_required',
          message: 'Confirm the Codex account for this OpenCode connection before reading its quotas.',
        })

      const snapshot = await adapter.read(model, currentSignal)

      if (!(await adapter.validateHost!(model, currentSignal)))
        throw new DOMException('Codex host connection changed during the quota read', 'AbortError')

      return JSON.stringify(snapshot)
    },
    async prepare(input: { target: MainCodexTarget; creditID?: string }, caller: { signal: AbortSignal }) {
      const currentSignal = signal(caller)
      const { model, adapter } = await capture(input.target, currentSignal)

      const snapshot = await adapter.prepareResetCreditConsumption!(model, input.creditID, currentSignal)

      if (!(await adapter.validateHost!(model, currentSignal)))
        throw new DOMException('Codex host connection changed during reset preparation', 'AbortError')

      return JSON.stringify(snapshot)
    },
    async consume(
      input: { target: MainCodexTarget; idempotencyKey: string; uncertain: boolean },
      caller: { signal: AbortSignal },
    ) {
      const currentSignal = signal(caller)
      const { model, adapter } = await capture(input.target, currentSignal)
      const document = await store.load()
      const attempt = document.user.pendingResetAttempt

      if (!attempt || attempt.idempotencyKey !== input.idempotencyKey || !resetAttemptMatches(model, attempt))
        throw new Error('The confirmed reset attempt or provider connection changed')

      const key = JSON.stringify([
        input.target.serverID,
        model.providerID,
        model.modelID,
        model.accountID,
        model.hostConnection?.id,
        attempt.idempotencyKey,
      ])
      const pending = consumptions.get(key)

      if (pending) return pending

      const request = adapter.consumeResetCredit!(model, { ...attempt, uncertain: input.uncertain }, currentSignal)

      consumptions.set(key, request)
      try {
        return await request
      } finally {
        if (consumptions.get(key) === request) consumptions.delete(key)
      }
    },
  }
}
