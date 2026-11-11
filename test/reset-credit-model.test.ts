import { expect, test } from 'bun:test'

import { createResetCreditModel } from '../src/features/provider-limits/model'

import type { PendingResetAttempt } from '../src/entities/preferences/model'
import type { ProviderQuotaAdapter, ProviderQuotaSnapshot, SelectedModel } from '../src/entities/provider-limit/model'

function fixture() {
  const model: SelectedModel = {
    sessionID: 'synthetic',
    providerID: 'openai',
    modelID: 'synthetic-model',
    accountID: 'account-a',
  }
  const snapshot: ProviderQuotaSnapshot = {
    model,
    providerId: 'openai',
    providerName: 'Synthetic',
    fetchedAt: 100,
    availability: 'ready',
    windows: [],
    accountId: 'account-a',
  }
  const calls: { key: string; uncertain?: boolean }[] = []
  let attempt: PendingResetAttempt | undefined
  let busy = false
  let current = true
  let fail = true
  let refreshes = 0
  let beforePersist = () => {}
  const adapter: ProviderQuotaAdapter = {
    id: 'synthetic',
    name: 'Synthetic',
    supports: () => true,
    read: async () => snapshot,
    prepareResetCreditConsumption: async () => snapshot,
    async consumeResetCredit(_model, value) {
      calls.push({ key: value.idempotencyKey, uncertain: value.uncertain })

      if (fail) throw new Error('Synthetic uncertain response')

      return 'alreadyRedeemed'
    },
  }
  const actions = createResetCreditModel({
    preferences: {
      pendingResetAttempt: () => attempt,
      async beginResetAttempt(value) {
        beforePersist()
        attempt = value
      },
      async finishResetAttempt(key) {
        expect(attempt?.idempotencyKey).toBe(key)
        attempt = undefined
      },
    },
    adapter,
    model,
    busy: () => busy,
    setBusy: (value) => {
      busy = value
    },
    current: () => current,
    signal: () => new AbortController().signal,
    id: () => 'synthetic-idempotency-key',
    now: () => 100,
    refresh: async () => {
      refreshes++
    },
  })

  return {
    actions,
    calls,
    snapshot,
    model,
    attempt: () => attempt,
    busy: () => busy,
    refreshes: () => refreshes,
    succeed: () => {
      fail = false
    },
    invalidateDuringPersistence: () => {
      beforePersist = () => {
        current = false
      }
    },
  }
}

test('reset review does not spend credits; uncertain retry preserves the exact attempt', async () => {
  const context = fixture()

  expect(await context.actions.review('credit-a')).toBe(context.snapshot)
  expect(context.calls).toEqual([])
  expect(context.attempt()).toBeUndefined()
  await Promise.resolve(expect(context.actions.consume('credit-a')).rejects.toThrow('Synthetic uncertain response'))
  expect(context.busy()).toBe(false)
  expect(context.attempt()?.creditID).toBe('credit-a')
  context.succeed()
  expect(await context.actions.consume('different-credit')).toBe('alreadyRedeemed')
  expect(context.calls).toEqual([
    { key: 'synthetic-idempotency-key', uncertain: false },
    { key: 'synthetic-idempotency-key', uncertain: true },
  ])
  expect(context.attempt()).toBeUndefined()
  expect(context.refreshes()).toBe(1)
})

test('reset target invalidation during persistence leaves a recoverable attempt without submitting', async () => {
  const context = fixture()

  context.invalidateDuringPersistence()
  expect(await context.actions.consume('credit-a')).toBeUndefined()
  expect(context.calls).toEqual([])
  expect(context.attempt()?.idempotencyKey).toBe('synthetic-idempotency-key')
  expect(context.busy()).toBe(false)
})

test('reset pending attempts cannot move to another provider account', async () => {
  const context = fixture()

  await Promise.resolve(expect(context.actions.consume()).rejects.toThrow('Synthetic uncertain response'))
  context.model.accountID = 'account-b'
  await Promise.resolve(expect(context.actions.consume()).rejects.toThrow('linked account and model'))
  expect(context.calls).toHaveLength(1)
  expect(context.attempt()?.accountID).toBe('account-a')
})
