import { expect, test } from 'bun:test'

import { quotaStatusMessage } from '../src/features/provider-limits/model'

import type { ProviderQuotaSnapshot } from '../src/entities/provider-limit/model'

const snapshot: ProviderQuotaSnapshot = {
  model: { providerID: 'openai', modelID: 'synthetic-model', sessionID: 'synthetic-session' },
  providerId: 'codex',
  providerName: 'Codex CLI',
  accountId: 'synthetic-account',
  availability: 'ready',
  fetchedAt: 1_800_000_000_000,
  windows: [{ id: 'ordinary', label: 'Ordinary quota', scope: 'account', remaining: 65, unit: '%' }],
  message: 'Codex account quota; shared across models, not a model-specific allowance.',
}
const updated = `Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString()}`

test('successful quotas show provider before update time, never scope prose', () => {
  expect(quotaStatusMessage({ snapshot, state: { status: 'ready' }, hasAdapter: true, showUpdatedAt: true })).toBe(
    `Codex CLI · ${updated}`,
  )
})

test('successful TUI quotas stay quiet without changing account scope', () => {
  expect(quotaStatusMessage({ snapshot, state: { status: 'ready' }, hasAdapter: true })).toBeUndefined()
  expect(snapshot.windows[0].scope).toBe('account')
})

test('successful balances and windows without descriptive messages use the same timestamp-only presentation', () => {
  for (const value of [
    { ...snapshot, message: undefined },
    {
      ...snapshot,
      windows: [],
      balances: [{ id: 'credit', label: 'Credit', amount: '10', unit: 'USD', scope: 'account' as const }],
    },
  ]) {
    expect(
      quotaStatusMessage({ snapshot: value, state: { status: 'ready' }, hasAdapter: true, showUpdatedAt: true }),
    ).toBe(`Codex CLI · ${updated}`)
    expect(quotaStatusMessage({ snapshot: value, state: { status: 'ready' }, hasAdapter: true })).toBeUndefined()
  }
})

test('native host provider name takes precedence over the quota transport label', () => {
  expect(
    quotaStatusMessage({
      snapshot,
      state: { status: 'ready' },
      hasAdapter: true,
      showUpdatedAt: true,
      providerName: 'OpenAI',
    }),
  ).toBe(`OpenAI · ${updated}`)
})

test('failed refreshes override the quiet success state for both renderers', () => {
  for (const showUpdatedAt of [true, false]) {
    expect(quotaStatusMessage({ snapshot, state: { status: 'error' }, hasAdapter: true, showUpdatedAt })).toBe(
      'Stale · refresh failed',
    )
    expect(quotaStatusMessage({ state: { status: 'error' }, hasAdapter: true, showUpdatedAt })).toBe(
      'Quota read failed · refresh to retry',
    )
  }
})

test.each([
  ['stale', 'Stale provider data · refresh to update'],
  ['rate_limited', 'Provider rate-limited this read · try again later'],
  ['unauthenticated', 'Codex sign-in or linked account changed · relink below'],
  ['unsupported', 'No documented quota bucket for this model'],
] as const)('%s guidance remains visible', (availability, expected) => {
  expect(
    quotaStatusMessage({
      snapshot: { ...snapshot, availability, message: undefined },
      state: { status: 'ready' },
      hasAdapter: true,
      showUpdatedAt: true,
    }),
  ).toBe(expected)
})

test.each(['setup_required', 'permission_required', 'unavailable'] as const)(
  '%s keeps provider guidance',
  (availability) => {
    const message = 'Synthetic provider action required'

    expect(
      quotaStatusMessage({
        snapshot: { ...snapshot, availability, message },
        state: { status: 'ready' },
        hasAdapter: true,
        showUpdatedAt: true,
      }),
    ).toBe(message)
  },
)

test('empty and stale snapshots retain their explicit guidance instead of a timestamp-only success', () => {
  const missing = {
    ...snapshot,
    windows: [],
    availability: 'unavailable' as const,
    message: 'Codex reported no applicable usage windows for this account and model.',
  }

  expect(
    quotaStatusMessage({ snapshot: missing, state: { status: 'ready' }, hasAdapter: true, showUpdatedAt: true }),
  ).toBe(missing.message)
  expect(
    quotaStatusMessage({
      snapshot: { ...snapshot, availability: 'stale', message: 'Synthetic stale response' },
      state: { status: 'ready' },
      hasAdapter: true,
      showUpdatedAt: true,
    }),
  ).toBe('Stale · Synthetic stale response')
})
