import { expect, test } from 'bun:test'

import { normalizeProviderQuota } from '../src/entities/provider-limit'

import type { ProviderQuotaSnapshot } from '../src/entities/provider-limit'

const selected = { sessionID: 'session-1', providerID: 'openai', modelID: 'gpt-5-codex' }

function quota(): ProviderQuotaSnapshot {
  return {
    model: selected,
    providerId: 'codex',
    providerName: 'Codex',
    accountId: 'account-1',
    fetchedAt: 1_800_000_000,
    availability: 'ready',
    ordinaryUsageAllowed: false,
    windows: [
      {
        id: '5h',
        label: 'Five hours',
        modelID: selected.modelID,
        limitID: 'codex',
        unit: '%',
        used: 75,
        durationMinutes: 300,
        resetsAt: 1_800_018_000,
      },
    ],
    bankedResets: { availableCount: 3 },
  }
}

test('retains selected-model quota windows and count-only banked reset credits', () => {
  const source = quota()
  const normalized = normalizeProviderQuota(source)

  expect(normalized.model).toEqual(selected)
  expect(normalized.windows[0]).toMatchObject({
    modelID: 'gpt-5-codex',
    limitID: 'codex',
    used: 75,
    unit: '%',
    durationMinutes: 300,
    resetsAt: 1_800_018_000,
  })
  expect(normalized.bankedResets?.availableCount).toBe(3)
  expect(normalized.bankedResets?.credits).toBeUndefined()
  expect(
    normalizeProviderQuota({ ...source, bankedResets: { availableCount: 3, credits: [] } }).bankedResets?.credits,
  ).toEqual([])
  expect(normalizeProviderQuota({ ...source, availability: 'rate_limited', windows: [] }).availability).toBe(
    'rate_limited',
  )
})

test('rejects unrelated model windows, missing host targets, and invalid credit counts', () => {
  const source = quota()

  expect(() =>
    normalizeProviderQuota({ ...source, windows: [{ ...source.windows[0], modelID: 'unrelated-model' }] }),
  ).toThrow('selected model')
  expect(() => normalizeProviderQuota({ ...source, model: { ...selected, sessionID: '' } })).toThrow('identity')
  expect(() => normalizeProviderQuota({ ...source, bankedResets: { availableCount: -1 } })).toThrow('count')
  expect(() => normalizeProviderQuota({ ...source, windows: [{ ...source.windows[0], resetsAt: Infinity }] })).toThrow(
    'invalid values',
  )
})
