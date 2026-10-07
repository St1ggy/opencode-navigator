import { expect, test } from 'bun:test'

import { createVersionStatus } from '../src/features/version-footer'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function api() {
  const disposers: (() => void)[] = []

  return {
    disposers,
    host: {
      app: { version: '2.0.0' },
      event: { on: () => () => {} },
      lifecycle: { onDispose: (dispose: () => void) => disposers.push(dispose) },
    } as unknown as TuiPluginApi,
  }
}

test('manual update checks can repeat, clear an obsolete indicator, and distinguish malformed/failing sources', async () => {
  const h = api()
  let version: unknown = '1.2.4'
  let statusCode = 200
  const request = Object.assign(async () => Response.json({ version }, { status: statusCode }), {
    preconnect() {},
  }) as typeof fetch
  const status = createVersionStatus(h.host, '1.2.3', request)

  try {
    expect(await status.refreshNavigator!()).toBe('update')
    expect(status.navigatorUpdate()).toBe('1.2.4')
    statusCode = 503
    expect(await status.refreshNavigator!()).toBe('unavailable')
    expect(status.navigatorUpdate()).toBe('1.2.4')
    statusCode = 200
    version = '1.2.3'
    expect(await status.refreshNavigator!()).toBe('current')
    expect(status.navigatorUpdate()).toBeUndefined()
    version = null
    expect(await status.refreshNavigator!()).toBe('unavailable')
    version = 'not-a-version'
    expect(await status.refreshNavigator!()).toBe('unavailable')
    statusCode = 503
    version = '1.2.4'
    expect(await status.refreshNavigator!()).toBe('unavailable')
  } finally {
    for (const dispose of h.disposers) dispose()
  }
})

test('startup/manual checks share one request and disposal prevents a late update indicator', async () => {
  const h = api()
  let calls = 0
  let finish!: (response: Response) => void
  const request = Object.assign(
    () => {
      calls++

      return new Promise<Response>((resolve) => {
        finish = resolve
      })
    },
    { preconnect() {} },
  ) as typeof fetch
  const status = createVersionStatus(h.host, '1.2.3', request)
  const pending = status.refreshNavigator!()

  expect(calls).toBe(1)
  expect(status.refreshNavigator!()).toBe(pending)
  for (const dispose of h.disposers) dispose()
  expect(await pending).toBe('unavailable')
  finish(Response.json({ version: '1.2.4' }))
  await Bun.sleep(0)
  expect(status.navigatorUpdate()).toBeUndefined()
})

test('update checking deadlines settle even when a fetch implementation ignores AbortSignal', async () => {
  const h = api()
  const request = Object.assign(() => new Promise<Response>(() => {}), { preconnect() {} }) as typeof fetch
  const status = createVersionStatus(h.host, '1.2.3', request, 15)

  try {
    expect(await status.refreshNavigator!()).toBe('unavailable')
    expect(await status.refreshNavigator!()).toBe('unavailable')
  } finally {
    for (const dispose of h.disposers) dispose()
  }
})

test('the update-check deadline also covers a stalled response body and permits recovery', async () => {
  const h = api()
  let stalled = true
  const request = Object.assign(
    async () =>
      stalled ? ({ ok: true, json: () => new Promise(() => {}) } as Response) : Response.json({ version: '1.2.4' }),
    { preconnect() {} },
  ) as typeof fetch
  const status = createVersionStatus(h.host, '1.2.3', request, 15)

  try {
    expect(await status.refreshNavigator!()).toBe('unavailable')
    stalled = false
    expect(await status.refreshNavigator!()).toBe('update')
    expect(status.navigatorUpdate()).toBe('1.2.4')
  } finally {
    for (const dispose of h.disposers) dispose()
  }
})
