import { expect, test } from 'bun:test'

import { normalizeProviderQuota } from '../src/entities/provider-limit'
import { readAnthropicQuota } from '../src/features/provider-limits/server/anthropic-quotas'
import { readFireworksQuota } from '../src/features/provider-limits/server/fireworks-quotas'
import { readOpenRouterQuota } from '../src/features/provider-limits/server/openrouter-quotas'
import { readNativeRest } from '../src/features/provider-limits/server/rest-balances'

import type { NativeQuotaRequest } from '../src/features/provider-limits/server/native-context'

function request(canonical: string, respond: (url: URL) => object | Response) {
  const calls: { url: URL; headers: Headers; redirect?: RequestRedirect }[] = []
  const fetcher = Object.assign(
    async (url: string | URL | Request, init?: RequestInit) => {
      const target = new URL(String(url))

      calls.push({ url: target, headers: new Headers(init?.headers), redirect: init?.redirect })
      const value = respond(target)

      return value instanceof Response ? value : Response.json(value)
    },
    { preconnect() {} },
  ) as typeof fetch
  const input = {
    canonical,
    model: { providerID: canonical, modelID: 'selected-model', sessionID: 'session' },
    apiModelID: 'native-model',
    provider: { id: canonical, name: 'Synthetic provider' },
    connectionID: 'credential:synthetic',
    credential: { type: 'key', key: 'synthetic-token' },
    token: 'synthetic-token',
    signal: new AbortController().signal,
    fetcher,
  } as NativeQuotaRequest

  return { input, calls }
}

test.each([
  [
    'deepseek',
    'https://api.deepseek.com/user/balance',
    { balance_infos: [{ currency: 'USD', total_balance: '2' }] },
    'USD',
    '2',
  ],
  [
    'moonshotai',
    'https://api.moonshot.ai/v1/users/me/balance',
    { code: 0, data: { available_balance: 3 } },
    'USD',
    '3',
  ],
  [
    'moonshotai-cn',
    'https://api.moonshot.cn/v1/users/me/balance',
    { code: 0, data: { available_balance: 4 } },
    'CNY',
    '4',
  ],
  [
    'siliconflow',
    'https://api.siliconflow.com/v1/user/info',
    { status: true, data: { totalBalance: '5' } },
    undefined,
    '5',
  ],
  [
    'novita-ai',
    'https://api.novita.ai/openapi/v1/billing/balance/detail',
    { availableBalance: '15000' },
    'USD',
    '1.5000',
  ],
  ['poe', 'https://api.poe.com/usage/current_balance', { current_point_balance: 100 }, 'points', '100'],
  ['aihubmix', 'https://aihubmix.com/api/user/self', { success: true, data: { quota: 500_000 } }, 'USD', '1.000000'],
] as const)('%s uses its documented read endpoint and native units', async (canonical, url, body, unit, amount) => {
  const h = request(canonical, () => body)
  const value = normalizeProviderQuota((await readNativeRest(h.input))!)

  expect(h.calls).toHaveLength(1)
  expect(h.calls[0].url.href).toBe(url)
  expect(h.calls[0].redirect).toBe('error')
  expect(h.calls[0].headers.get('authorization')).toBe('Bearer synthetic-token')
  expect(value.balances?.[0]).toMatchObject({ amount, ...(unit && { unit }) })

  if (!unit) expect(value.balances?.[0].unit).toBeUndefined()

  expect(JSON.stringify(value)).not.toContain('synthetic-token')
})

test('native balance credentials are never sent to provider APIs for a custom gateway', async () => {
  const h = request('deepseek', () => {
    throw new Error('Must not fetch')
  })

  h.input.provider.settings = { baseURL: 'https://synthetic-gateway.example/v1' }
  expect(await readNativeRest(h.input)).toBeUndefined()
  expect(h.calls).toHaveLength(0)
})

test('MiniMax chooses subscription and balance endpoints using the official credential rule', async () => {
  const h = request('minimax', (url) =>
    url.pathname === '/account/query_balance'
      ? { available_amount: '1.25', base_resp: { status_code: 0 } }
      : {
          model_remains: [
            { model_name: 'native-model', current_interval_total_count: 100, current_interval_remaining_percent: 75 },
          ],
        },
  )

  expect((await readNativeRest(h.input))?.windows[0]).toMatchObject({ used: 25, remaining: 75 })
  h.input.token = 'sk-api-synthetic'
  expect((await readNativeRest(h.input))?.balances?.[0]).toMatchObject({ amount: '1.25' })
  expect(h.calls.map((entry) => entry.url.pathname)).toEqual(['/v1/token_plan/remains', '/account/query_balance'])
})

test('NanoGPT associates subscription tokens with its subscription-only catalog and preserves exhausted counters', async () => {
  const h = request('nano-gpt', (url) => {
    if (url.pathname === '/api/check-balance') return { usd_balance: '0', nano_balance: '0' }

    if (url.pathname === '/api/subscription/v1/models') return { data: [{ id: 'native-model' }] }

    return {
      active: true,
      routing: { recommendedMode: 'unavailable' },
      limits: { dailyInputTokens: 100 },
      dailyInputTokens: { used: 100, remaining: 0, resetAt: 1_800_000_000_000 },
    }
  })
  const value = normalizeProviderQuota((await readNativeRest(h.input))!)

  expect(value.windows[0]).toMatchObject({
    total: 100,
    used: 100,
    remaining: 0,
    unit: 'tokens',
    resetsAt: 1_800_000_000,
  })
  h.input.apiModelID = 'uncovered-model'
  expect((await readNativeRest(h.input))?.windows).toHaveLength(0)
})

test('NanoGPT subscription failures do not discard a separately reported account balance', async () => {
  const h = request('nano-gpt', (url) =>
    url.pathname === '/api/check-balance' ? { usd_balance: '2' } : new Response('', { status: 403 }),
  )
  const value = await readNativeRest(h.input)

  expect(value?.availability).toBe('ready')
  expect(value?.balances?.[0]).toMatchObject({ amount: '2', unit: 'USD' })
  expect(value?.windows).toHaveLength(0)
})

test('Anthropic configured model limits follow pagination and do not invent remaining capacity', async () => {
  const h = request('anthropic', (url) =>
    url.searchParams.has('page')
      ? {
          data: [
            {
              id: 'limit',
              group: { type: 'model_group' },
              models: ['native-model'],
              limits: [{ type: 'requests_per_minute', value: 25 }],
            },
          ],
        }
      : { data: [], next_page: 'next' },
  )
  const value = await readAnthropicQuota(h.input)

  expect(h.calls).toHaveLength(2)
  expect(h.calls[0].headers.get('x-api-key')).toBe('synthetic-token')
  expect(value.windows[0]).toMatchObject({ kind: 'configured_limit', total: 25, modelID: 'selected-model' })
  expect(value.windows[0].used).toBeUndefined()
  expect(value.windows[0].remaining).toBeUndefined()
})

test('Fireworks rejects ambiguous accounts and excludes GPU quotas from chat model limits', async () => {
  const h = request('fireworks-ai', (url) =>
    url.pathname === '/v1/accounts'
      ? { accounts: [{ name: 'accounts/synthetic' }] }
      : {
          quotas: [
            { name: 'accounts/synthetic/quotas/h100', value: '4' },
            { name: 'accounts/synthetic/quotas/monthly-spend-usd', value: '200', usage: 20 },
          ],
        },
  )
  const value = await readFireworksQuota(h.input)

  expect(value?.windows).toHaveLength(1)
  expect(value?.windows[0]).toMatchObject({ unit: 'USD', total: 200, used: 20, remaining: 180 })
  const ambiguous = request('fireworks-ai', () => ({ accounts: [{ name: 'accounts/one' }, { name: 'accounts/two' }] }))

  expect((await readFireworksQuota(ambiguous.input))?.availability).toBe('unavailable')
  expect(ambiguous.calls).toHaveLength(1)
})

test('OpenRouter key budgets are USD, and account credits are requested only for management keys', async () => {
  let management = false
  const h = request('openrouter', (url) =>
    url.pathname.endsWith('/credits')
      ? { data: { total_credits: 100, total_usage: 20 } }
      : {
          data: {
            limit: 50,
            limit_remaining: 40,
            is_management_key: management,
            free_model_daily_requests: { limit: 50, remaining: 38, used: 12 },
          },
        },
  )
  const ordinary = await readOpenRouterQuota(h.input)

  expect(h.calls).toHaveLength(1)
  expect(ordinary?.balances?.[0]).toMatchObject({ scope: 'key', amount: '40', unit: 'USD' })
  expect(ordinary?.windows).toHaveLength(0)
  management = true
  h.input.apiModelID = 'native-model:free'
  const value = await readOpenRouterQuota(h.input)

  expect(value?.balances?.[1]).toMatchObject({ scope: 'account', amount: '80', unit: 'USD' })
  expect(value?.windows[0]).toMatchObject({ used: 12, remaining: 38, unit: 'requests' })
  expect(h.calls.at(-1)?.url.pathname).toBe('/api/v1/credits')
})
