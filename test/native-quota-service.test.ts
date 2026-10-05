import { expect, test } from 'bun:test'

import { createNativeQuotaService } from '../src/features/provider-limits/server/quota-service'

import type { Context } from '@opencode/plugin/promise/plugin'
import type { SessionHttpRequest, SessionHttpResponse } from '@opencode/plugin/promise/session'

function harness(providerID = 'deepseek') {
  let connection = { type: 'credential' as const, id: 'one', label: 'Synthetic', method: 'key' as const }
  let token = 'synthetic-secret'
  const requests: { url: string; auth: string | null }[] = []
  const host = {
    provider: {
      get: async () => ({ data: { id: providerID, name: providerID, integrationID: providerID, activation: 'auto' } }),
    },
    model: {
      list: async () => ({ data: [{ id: 'selected-model', modelID: 'native-model', providerID, enabled: true }] }),
    },
    integration: { connection: { active: async () => connection, resolve: async () => ({ type: 'key', key: token }) } },
  } as unknown as Context
  const fetcher = Object.assign(
    async (url: string | URL | Request, options?: RequestInit) => {
      requests.push({ url: String(url), auth: new Headers(options?.headers).get('authorization') })

      return Response.json({
        is_available: true,
        balance_infos: [
          { currency: 'USD', total_balance: '42.00', granted_balance: '2.00', topped_up_balance: '40.00' },
        ],
      })
    },
    { preconnect() {} },
  ) as typeof fetch
  const service = createNativeQuotaService(host, new AbortController().signal, fetcher)

  return {
    service,
    requests,
    host,
    switchAccount() {
      connection = { ...connection, id: 'two' }
      token = 'second-synthetic-secret'
      service.invalidate()
    },
    rotateToken() {
      token = 'rotated-synthetic-secret'
    },
  }
}

test('native provider reads reuse only the active integration credential and return no secret material', async () => {
  const h = harness()
  const target = {
    providerID: 'deepseek',
    modelID: 'selected-model',
    sessionID: 'session',
    connectionID: 'credential:one',
  }

  try {
    const first = await h.service.read(target, new AbortController().signal)

    expect(first.availability).toBe('ready')
    expect(first.balances?.[0]).toMatchObject({ amount: '42.00', unit: 'USD' })
    expect(h.requests).toHaveLength(1)
    expect(h.requests[0].auth).toBe('Bearer synthetic-secret')
    expect(JSON.stringify(first)).not.toContain('synthetic-secret')
    await h.service.read(target, new AbortController().signal)
    expect(h.requests).toHaveLength(1)
    h.switchAccount()
    expect((await h.service.read(target, new AbortController().signal)).availability).toBe('unauthenticated')
    expect(h.requests).toHaveLength(1)
    await h.service.read({ ...target, connectionID: 'credential:two' }, new AbortController().signal)
    expect(h.requests[1].auth).toBe('Bearer second-synthetic-secret')
  } finally {
    await h.service.dispose()
  }
})

test('credential rotation under the same connection ID rejects late quota observations', async () => {
  const h = harness('groq')
  const request = new Request('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: 'Bearer synthetic-secret' },
  })
  const event = {
    model: { id: 'selected-model', providerID: 'groq' },
    sessionID: 'session',
    kind: 'primary',
    agent: 'synthetic',
    request,
  }

  try {
    await h.service.request(event as unknown as SessionHttpRequest)
    h.rotateToken()
    expect(
      await h.service.response({
        ...event,
        response: new Response('', { headers: { 'x-ratelimit-remaining-tokens': '80' } }),
      } as unknown as SessionHttpResponse),
    ).toBe(false)
    const result = await h.service.read(
      { providerID: 'groq', modelID: 'selected-model', sessionID: 'session', connectionID: 'credential:one' },
      new AbortController().signal,
    )

    expect(result.windows).toHaveLength(0)
    expect(result.availability).toBe('waiting')
    expect(h.requests).toHaveLength(0)
  } finally {
    await h.service.dispose()
  }
})

test('compatible gateway headers are not presented as a native provider quota', async () => {
  const h = harness('groq')
  const request = new Request('https://synthetic-gateway.example/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: 'Bearer synthetic-secret' },
  })
  const event = {
    model: { id: 'selected-model', providerID: 'groq' },
    sessionID: 'session',
    kind: 'primary',
    agent: 'synthetic',
    request,
  }

  try {
    await h.service.request(event as unknown as SessionHttpRequest)
    expect(
      await h.service.response({
        ...event,
        response: new Response('', { headers: { 'x-ratelimit-remaining-tokens': '80' } }),
      } as unknown as SessionHttpResponse),
    ).toBe(false)
  } finally {
    await h.service.dispose()
  }
})

test('native headers are observed without inference calls or consuming response bodies', async () => {
  const h = harness('groq')
  const request = new Request('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: 'Bearer synthetic-secret' },
  })
  const common = {
    model: { id: 'selected-model', providerID: 'groq' },
    sessionID: 'session',
    kind: 'primary',
    agent: 'synthetic',
    request,
  }

  try {
    await h.service.request(common as unknown as SessionHttpRequest)
    const response = new Response('synthetic model stream', {
      headers: { 'x-ratelimit-limit-tokens': '100', 'x-ratelimit-remaining-tokens': '80' },
    })

    expect(await h.service.response({ ...common, response } as unknown as SessionHttpResponse)).toBe(true)
    expect(await response.text()).toBe('synthetic model stream')
    const snapshot = await h.service.read(
      { providerID: 'groq', modelID: 'selected-model', sessionID: 'session', connectionID: 'credential:one' },
      new AbortController().signal,
    )

    expect(snapshot.windows[0]).toMatchObject({ unit: 'tokens', used: 20, modelID: 'selected-model' })
    expect(h.requests).toHaveLength(0)
    h.switchAccount()
    expect(
      await h.service.response({
        ...common,
        response: new Response('', {
          headers: { 'x-ratelimit-limit-tokens': '100', 'x-ratelimit-remaining-tokens': '100' },
        }),
      } as unknown as SessionHttpResponse),
    ).toBe(false)
  } finally {
    await h.service.dispose()
  }
})
