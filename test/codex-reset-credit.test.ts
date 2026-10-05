import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'

import { createCodexQuotaAdapter } from '../src/features/provider-limits/model/codex-quota-adapter'

import type { SelectedModel } from '../src/entities/provider-limit'
import type { CodexAppServerClient } from '../src/features/provider-limits/model/codex-app-server'

const model: SelectedModel = {
  sessionID: 'session-1',
  providerID: 'openai',
  modelID: 'gpt-5-codex',
  accountID: 'account-1',
}

test('banked reset remains manual and validates eligible model, account and credit before submission', async () => {
  const methods: string[] = []
  const credit = {
    id: 'credit-1',
    resetType: 'codexRateLimits',
    status: 'available',
    grantedAt: 1_700_000_000,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    title: 'One reset',
    description: null,
  }
  let accountId = 'account-1'
  const client = {
    async request(method: string) {
      methods.push(method)

      if (method === 'account/read') return { account: { type: 'chatgpt' } }

      if (method === 'account/rateLimits/read')
        return {
          accountId,
          ordinaryUsageAllowed: false,
          rateLimits: {
            limitId: 'codex',
            limitName: 'Codex',
            normalModelSlug: model.modelID,
            primary: { usedPercent: 100, windowDurationMins: 300, resetsAt: 1_800_000_000 },
            secondary: null,
          },
          rateLimitsByLimitId: null,
          rateLimitResetCredits: { availableCount: 1, credits: [credit] },
        }

      return { outcome: 'reset' }
    },
    dispose() {},
  } as unknown as CodexAppServerClient
  const adapter = createCodexQuotaAdapter(client)
  const signal = new AbortController().signal

  await adapter.prepareResetCreditConsumption!(model, 'credit-1', signal)
  expect(methods).not.toContain('account/rateLimitResetCredit/consume')
  accountId = 'account-2'
  await expect(
    adapter.consumeResetCredit!(
      model,
      { accountID: 'account-1', creditID: 'credit-1', idempotencyKey: randomUUID() },
      signal,
    ),
  ).rejects.toThrow('Codex account')
  expect(methods).not.toContain('account/rateLimitResetCredit/consume')
  accountId = 'account-1'
  const outcome = await adapter.consumeResetCredit!(
    model,
    { accountID: 'account-1', creditID: 'credit-1', idempotencyKey: randomUUID() },
    signal,
  )

  expect(outcome).toBe('reset')
  expect(methods.filter((method) => method === 'account/rateLimitResetCredit/consume')).toHaveLength(1)
})

test('uncertain redemption retries with its original idempotency key after credits disappear', async () => {
  const idempotencyKey = randomUUID()
  const keys: string[] = []
  const client = {
    async request(method: string, params: Record<string, unknown>) {
      if (method === 'account/read') return { account: { type: 'chatgpt' } }

      if (method === 'account/rateLimits/read')
        return {
          accountId: 'account-1',
          ordinaryUsageAllowed: true,
          rateLimits: {
            limitId: 'codex',
            limitName: 'Codex',
            normalModelSlug: model.modelID,
            primary: null,
            secondary: null,
          },
          rateLimitsByLimitId: null,
          rateLimitResetCredits: { availableCount: 0, credits: [] },
        }

      keys.push(params.idempotencyKey as string)

      return { outcome: 'alreadyRedeemed' }
    },
    dispose() {},
  } as unknown as CodexAppServerClient
  const adapter = createCodexQuotaAdapter(client)
  const signal = new AbortController().signal
  const attempt = { accountID: 'account-1', idempotencyKey, uncertain: true }

  expect(await adapter.consumeResetCredit!(model, attempt, signal)).toBe('alreadyRedeemed')
  expect(await adapter.consumeResetCredit!(model, attempt, signal)).toBe('alreadyRedeemed')
  expect(keys).toEqual([idempotencyKey, idempotencyKey])
})
