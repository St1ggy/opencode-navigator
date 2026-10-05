import { expect, test } from 'bun:test'

import { readProviderJson, readQuotaResponseBody } from '../src/features/provider-limits/server/native-http'

test('quota body cancellation settles a hung stream even when cancellation itself hangs', async () => {
  const controller = new AbortController()
  const response = new Response(new ReadableStream({ cancel: () => new Promise(() => {}) }))
  const pending = readQuotaResponseBody(response, controller.signal)

  controller.abort(new Error('Synthetic cancellation'))
  await expect(pending).rejects.toThrow('Synthetic cancellation')
})

test('reading a quota response clone does not wait for or consume the host response', async () => {
  const host = Response.json({ synthetic: true })
  const quota = await readQuotaResponseBody(host.clone())

  expect(quota).toEqual({ synthetic: true })
  expect(await host.json()).toEqual({ synthetic: true })
})

test('quota JSON reads reject oversized and malformed responses', async () => {
  await expect(readQuotaResponseBody(new Response('not JSON'))).rejects.toThrow('invalid')
  await expect(readQuotaResponseBody(new Response(' '.repeat(1_000_001)))).rejects.toThrow('too large')
})

test('quota transport cancellation does not rely on a fetch implementation honoring AbortSignal', async () => {
  const controller = new AbortController()
  const fetcher = Object.assign(async () => new Promise<Response>(() => {}), { preconnect() {} }) as typeof fetch
  const pending = readProviderJson(fetcher, 'https://example.com/quota', 'synthetic-token', controller.signal)

  controller.abort(new Error('Synthetic cancellation'))
  await expect(pending).rejects.toThrow('Synthetic cancellation')
})
