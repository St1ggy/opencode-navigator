import { expect, test } from 'bun:test'

import { createCodexQuotaAdapter } from '../src/features/provider-limits/model/codex-quota-adapter'

import type { SelectedModel } from '../src/entities/provider-limit'
import type { CodexAppServerClient } from '../src/features/provider-limits/model/codex-app-server'

const selected: SelectedModel = {
  sessionID: 'session-1',
  providerID: 'openai',
  modelID: 'gpt-5-codex',
  accountID: 'account-1',
}
const window = { usedPercent: 78, windowDurationMins: 300, resetsAt: 1_800_000_000 }
const currentLimit = {
  limitId: 'codex',
  limitName: 'Codex',
  normalModelSlug: 'gpt-5-codex',
  primary: window,
  secondary: null,
}
const otherLimit = {
  limitId: 'other',
  limitName: 'Other model',
  normalModelSlug: 'different-model',
  primary: window,
  secondary: null,
}

function adapter(accountId = 'account-1', details: unknown = null) {
  const calls: string[] = []
  const client = {
    async request(method: string, params: Record<string, unknown>) {
      calls.push(method)

      if (method === 'account/read') return { account: { type: 'chatgpt' } }

      expect(params.excludeResetCreditDetails).toBe(false)

      return {
        accountId,
        ordinaryUsageAllowed: false,
        rateLimits: otherLimit,
        rateLimitsByLimitId: { codex: currentLimit, other: otherLimit },
        rateLimitResetCredits: { availableCount: 3, credits: details },
      }
    },
    dispose() {},
  } as unknown as CodexAppServerClient

  return { client: createCodexQuotaAdapter(client), calls }
}

test('Codex quota adapter keeps only selected-model windows and count-only reset credits', async () => {
  const { client, calls } = adapter()
  const snapshot = await client.read(selected, new AbortController().signal)

  expect(client.supports(selected)).toBe(true)
  expect(client.supports({ ...selected, providerID: 'anthropic' })).toBe(false)
  expect(client.supports({ ...selected, accountID: undefined })).toBe(false)
  expect(calls).toEqual(['account/read', 'account/rateLimits/read'])
  expect(snapshot.windows).toEqual([
    {
      id: 'codex.primary',
      label: 'Codex · primary',
      modelID: selected.modelID,
      limitID: 'codex',
      unit: '%',
      used: 78,
      durationMinutes: 300,
      resetsAt: 1_800_000_000,
    },
  ])
  expect(snapshot.bankedResets?.availableCount).toBe(3)
  expect(snapshot.bankedResets?.credits).toBeUndefined()
})

test('Codex quota adapter rejects different accounts and unrelated model buckets', async () => {
  const mismatched = await adapter('different-account').client.read(selected, new AbortController().signal)

  expect(mismatched.availability).toBe('unauthenticated')
  expect(mismatched.windows).toEqual([])
  expect(mismatched.bankedResets).toBeUndefined()
  const different = await adapter().client.read(
    { ...selected, modelID: 'not-a-codex-bucket' },
    new AbortController().signal,
  )

  expect(different.availability).toBe('unsupported')
  expect(different.windows).toEqual([])
  expect(different.bankedResets).toBeUndefined()
})

test('Codex quota adapter retains provider-supplied credit expiry and detail state', async () => {
  const credit = {
    id: 'credit-1',
    resetType: 'codexRateLimits',
    status: 'available',
    grantedAt: 1_790_000_000,
    expiresAt: 1_810_000_000,
    title: 'Banked reset',
    description: 'One reset',
  }
  const snapshot = await adapter('account-1', [credit]).client.read(selected, new AbortController().signal)

  expect(snapshot.bankedResets?.credits).toEqual([
    {
      id: 'credit-1',
      type: 'codexRateLimits',
      status: 'available',
      grantedAt: 1_790_000_000,
      expiresAt: 1_810_000_000,
      title: 'Banked reset',
      description: 'One reset',
    },
  ])
})
