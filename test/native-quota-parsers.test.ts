import { expect, test } from 'bun:test'

import { normalizeProviderQuota } from '../src/entities/provider-limit'
import {
  aiHubMixBalances,
  balanceSnapshot,
  deepSeekBalances,
  moonshotBalances,
  novitaBalances,
  openRouterBudget,
  poeBalances,
} from '../src/features/provider-limits/server/balance-parsers'
import { nativeHeaderWindows } from '../src/features/provider-limits/server/header-parsers'
import {
  anthropicConfiguredWindows,
  miniMaxWindows,
  nanoWindows,
} from '../src/features/provider-limits/server/subscription-parsers'

const model = { providerID: 'synthetic-provider', modelID: 'selected-model', sessionID: 'session' }

test('native balances preserve currency, exact decimal scales and missing values', () => {
  const deepseek = deepSeekBalances({
    balance_infos: [
      { currency: 'CNY', total_balance: '110.00', granted_balance: '10.00', topped_up_balance: '100.00' },
    ],
  })

  expect(deepseek[0]).toMatchObject({ amount: '110.00', unit: 'CNY', scope: 'account' })
  expect(novitaBalances({ availableBalance: '90071992547409931234' })[0].amount).toBe('9007199254740993.1234')
  expect(aiHubMixBalances({ success: true, data: { quota: 500_000 } })[0].amount).toBe('1.000000')
  expect(
    moonshotBalances(
      { code: 0, status: true, data: { available_balance: 5, cash_balance: -1, voucher_balance: 5 } },
      'USD',
    ).find((entry) => entry.id === 'cash')?.amount,
  ).toBe('-1')
  expect(poeBalances({ current_point_balance: 1500 })[0]).toMatchObject({ amount: '1500', unit: 'points' })
  expect(deepSeekBalances({ balance_infos: null })).toEqual([])
  expect(balanceSnapshot(model, 'Synthetic', []).availability).toBe('unavailable')
  expect(openRouterBudget({ data: { limit: null, limit_remaining: null } })[0]).toMatchObject({
    unlimited: true,
    scope: 'key',
  })
})

test('native response headers retain model association and provider-specific window units', () => {
  const now = 1_800_000_000_000
  const windows = nativeHeaderWindows(
    'groq',
    model.modelID,
    new Headers({
      'x-ratelimit-limit-requests': '14400',
      'x-ratelimit-remaining-requests': '14370',
      'x-ratelimit-reset-requests': '2m59.56s',
      'x-ratelimit-limit-tokens': '18000',
      'x-ratelimit-remaining-tokens': '17997',
      'x-ratelimit-reset-tokens': '7.66s',
    }),
    now,
  )

  expect(windows[0]).toMatchObject({
    modelID: model.modelID,
    durationMinutes: 1440,
    unit: 'requests',
    used: 30,
    remaining: 14_370,
    kind: 'rate_limit',
  })
  expect(windows[1]).toMatchObject({ durationMinutes: 1, unit: 'tokens', used: 3, resetsAt: now / 1000 + 7.66 })
  const capacity = nativeHeaderWindows(
    'fireworks-ai',
    model.modelID,
    new Headers({ 'x-ratelimit-limit-tokens-generated': '300' }),
  )

  expect(capacity[0]).toMatchObject({ kind: 'configured_limit', total: 300, unit: 'tokens/s' })
  expect(capacity[0].used).toBeUndefined()
  expect(() => normalizeProviderQuota({ ...balanceSnapshot(model, 'Synthetic', []), windows: capacity })).not.toThrow()
})

test('quota headers preserve millisecond reset durations without applying another provider schema', () => {
  const now = 1_800_000_000_000
  const headers = new Headers({
    'x-ratelimit-remaining-tokens': '80',
    'x-ratelimit-reset-tokens': '1m500ms',
    'anthropic-ratelimit-remaining-input-tokens': '90',
  })

  expect(nativeHeaderWindows('openai', model.modelID, headers, now)[0].resetsAt).toBe(now / 1000 + 60.5)
  expect(nativeHeaderWindows('openai', model.modelID, headers)).toHaveLength(1)
  expect(nativeHeaderWindows('anthropic', model.modelID, headers)).toHaveLength(1)
  expect(nativeHeaderWindows('unverified-gateway', model.modelID, headers)).toHaveLength(0)
})

test('subscription model mapping and null/degraded counters never create a full allowance', () => {
  const rows = {
    model_remains: [
      { model_name: 'different-model', current_interval_total_count: 100, current_interval_remaining_percent: 100 },
      {
        model_name: 'selected-model',
        current_interval_total_count: 100,
        current_interval_usage_count: 25,
        current_interval_remaining_percent: 75,
        current_weekly_total_count: 0,
        current_weekly_status: 3,
      },
    ],
  }
  const windows = miniMaxWindows(rows, model.modelID, 'selected-model')

  expect(windows).toHaveLength(1)
  expect(windows[0]).toMatchObject({ used: 25, remaining: 75, unit: '%', modelID: model.modelID })
  const unknown = miniMaxWindows(
    {
      model_remains: [
        { model_name: 'selected-model', current_interval_total_count: 100, current_interval_usage_count: 25 },
      ],
    },
    model.modelID,
    'selected-model',
  )

  expect(unknown[0].used).toBeUndefined()
  expect(unknown[0].kind).toBe('configured_limit')
  expect(
    nanoWindows(
      {
        active: true,
        limits: { dailyInputTokens: 100 },
        dailyInputTokens: { used: null, remaining: null, degraded: true },
      },
      model.modelID,
    ),
  ).toEqual([])
  const configured = anthropicConfiguredWindows(
    {
      data: [
        {
          id: 'other',
          group: { type: 'model_group' },
          models: ['other-model'],
          limits: [{ type: 'requests_per_minute', value: 50 }],
        },
        {
          id: 'selected',
          group: { type: 'model_group' },
          models: ['selected-model'],
          limits: [{ type: 'input_tokens_per_minute', value: 30_000 }],
        },
      ],
    },
    model.modelID,
    'selected-model',
  )

  expect(configured).toHaveLength(1)
  expect(configured[0]).toMatchObject({
    total: 30_000,
    unit: 'tokens',
    modelID: model.modelID,
    kind: 'configured_limit',
  })
})
