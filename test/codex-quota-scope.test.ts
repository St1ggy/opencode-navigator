import { expect, test } from 'bun:test'

import { normalizeProviderQuota } from '../src/entities/provider-limit'
import { createCodexAppServerClient } from '../src/features/provider-limits/model/codex-app-server'
import { createCodexQuotaAdapter } from '../src/features/provider-limits/model/codex-quota-adapter'

import type { SelectedModel } from '../src/entities/provider-limit'
import type { CodexAppServerClient } from '../src/features/provider-limits/model/codex-app-server'

const selected: SelectedModel = {
  providerID: 'openai',
  modelID: 'gpt-6.1-sol-fast',
  sessionID: 'synthetic-session',
  accountID: 'synthetic-account',
}

test('a verified Codex account quota is visible even when the real RPC omits a model slug', async () => {
  const limit = {
    limitId: 'codex',
    limitName: null,
    normalModelSlug: null,
    primary: { usedPercent: 35, windowDurationMins: 300, resetsAt: 1_800_000_000 },
    secondary: null,
  }
  const client = {
    async request(method: string) {
      if (method === 'account/read') return { account: { type: 'chatgpt' } }

      return {
        accountId: selected.accountID,
        ordinaryUsageAllowed: true,
        rateLimits: limit,
        rateLimitsByLimitId: { codex: limit },
        rateLimitResetCredits: { availableCount: 2, credits: null },
      }
    },
    dispose() {},
  } as unknown as CodexAppServerClient
  const snapshot = await createCodexQuotaAdapter(client).read(selected, new AbortController().signal)

  expect(snapshot.availability).toBe('ready')
  expect(snapshot.windows).toHaveLength(1)
  expect(snapshot.windows[0]).toMatchObject({ used: 35, limitID: 'codex' })
  expect(snapshot.windows[0].modelID).toBeUndefined()
  expect(snapshot.message).toContain('account')
  expect(snapshot.bankedResets?.availableCount).toBe(2)
})

const ordinary = {
  limitId: 'codex',
  limitName: null,
  normalModelSlug: null,
  primary: { usedPercent: 35, windowDurationMins: 300, resetsAt: 1_800_000_000 },
  secondary: null,
}

async function read(overrides: Record<string, unknown> = {}, target = selected) {
  const client = {
    async request(method: string) {
      if (method === 'account/read') return { account: { type: 'chatgpt' } }

      return {
        accountId: selected.accountID,
        ordinaryUsageAllowed: false,
        rateLimits: ordinary,
        rateLimitsByLimitId: null,
        rateLimitResetCredits: { availableCount: 2, credits: null },
        ...overrides,
      }
    },
    dispose() {},
  } as unknown as CodexAppServerClient

  return createCodexQuotaAdapter(client).read(target, new AbortController().signal)
}

test('ordinary account scope survives null model metadata and other quota aliases without duplicates', async () => {
  const modelLimit = { ...ordinary, limitId: 'model-alias', normalModelSlug: selected.modelID }
  const unrelated = { ...ordinary, limitId: 'unrelated', normalModelSlug: 'another-model' }
  const snapshot = await read({ rateLimitsByLimitId: { codex: ordinary, 'model-alias': modelLimit, unrelated } })

  expect(snapshot.windows).toHaveLength(2)
  expect(snapshot.windows[0]).toMatchObject({ scope: 'account', limitID: 'codex' })
  expect(snapshot.windows[1]).toMatchObject({ modelID: selected.modelID, limitID: 'model-alias' })
  expect(snapshot.windows.some((window) => window.limitID === 'unrelated')).toBe(false)
  const different = await read({ rateLimitsByLimitId: { unrelated } }, { ...selected, modelID: 'unlisted-fast-model' })

  expect(different.windows).toHaveLength(1)
  expect(different.windows[0]).toMatchObject({ scope: 'account', limitID: 'codex' })
})

test('quota alias display metadata is not required to match an ordinary account bucket', async () => {
  const snapshot = await read({ rateLimits: { ...ordinary, normalModelSlug: 'different-model' } })

  expect(snapshot.windows[0]).toMatchObject({ scope: 'account', limitID: 'codex' })
})

test('backward-compatible ordinary windows and count-only credits do not depend on a model slug', async () => {
  const snapshot = await read({ rateLimits: { ...ordinary, limitId: null } })

  expect(snapshot.windows[0]).toMatchObject({ scope: 'account', limitID: 'codex' })
  expect(snapshot.bankedResets?.availableCount).toBe(2)
  const missing = await read({ rateLimits: { ...ordinary, primary: null } })

  expect(missing.windows).toHaveLength(0)
  expect(missing.availability).toBe('unavailable')
  expect(missing.bankedResets?.availableCount).toBe(2)
  expect(missing.bankedResets?.credits).toBeUndefined()
})

test('unrelated named buckets never masquerade as the ordinary Codex account quota', async () => {
  const unrelated = { ...ordinary, limitId: 'different-bucket', normalModelSlug: 'another-model' }
  const snapshot = await read({ rateLimits: unrelated, rateLimitsByLimitId: { 'different-bucket': unrelated } })

  expect(snapshot.windows).toHaveLength(0)
  expect(snapshot.availability).toBe('unavailable')
  const changed = await read({ accountId: 'different-account' })

  expect(changed.availability).toBe('unauthenticated')
  expect(changed.windows).toHaveLength(0)
  expect(changed.bankedResets).toBeUndefined()
})

test('account-scoped windows require an account identity and cannot claim a model association', async () => {
  const snapshot = await read()

  expect(() => normalizeProviderQuota({ ...snapshot, accountId: undefined })).toThrow('Quota window')
  expect(() =>
    normalizeProviderQuota({
      ...snapshot,
      windows: [{ ...snapshot.windows[0], modelID: selected.modelID }],
    }),
  ).toThrow('Quota window')
})

test('the screenshot protocol fixture exercises an ordinary nullable account bucket through JSON-RPC', async () => {
  const client = createCodexAppServerClient({
    version: 'fixture',
    command: ['bun', new URL('../screenshots/harness/codex-app-server.mjs', import.meta.url).pathname],
  })

  try {
    const snapshot = await createCodexQuotaAdapter(client).read(
      { ...selected, accountID: 'synthetic-codex-account' },
      new AbortController().signal,
    )

    expect(snapshot.availability).toBe('ready')
    expect(snapshot.windows).toHaveLength(2)
    expect(snapshot.windows.every((window) => window.scope === 'account' && window.modelID === undefined)).toBe(true)
    expect(snapshot.bankedResets?.availableCount).toBe(2)
  } finally {
    client.dispose()
  }
})
