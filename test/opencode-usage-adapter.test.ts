import { expect, test } from 'bun:test'

import { createProviderLimitsController } from '../src/entities/provider-limit'
import { createOpenCodeUsageAdapter } from '../src/features/provider-limits'

import { hostUsage } from './fixtures/host-usage'

import type { Plugin } from '@opencode/plugin/tui'

function fixture() {
  const handlers = new Map<string, (event: any) => void>()
  let read: () => Promise<unknown> = async () => ({ location: { directory: '/synthetic' }, data: hostUsage })
  let nativeReads = 0
  const context = {
    location: { directory: '/synthetic' },
    data: {
      on: (name: string, handler: (event: any) => void) => {
        handlers.set(name, handler)

        return () => handlers.delete(name)
      },
      location: {
        provider: { list: () => [{ id: 'console', name: 'Console', integrationID: 'opencode' }] },
        model: { list: () => [] },
      },
    },
    client: {
      usage: {
        limits: async () => {
          nativeReads++

          return read()
        },
      },
    },
  } as unknown as Plugin.Context

  return {
    context,
    handlers,
    count: () => nativeReads,
    setRead: (value: typeof read) => {
      read = value
    },
  }
}
const model = { providerID: 'console', modelID: 'model', sessionID: 'session' }

test('native usage owns its coverage even on errors and never falls through to external readers', async () => {
  const h = fixture()
  const usage = createOpenCodeUsageAdapter(h.context)
  let fallbackReads = 0
  const fallback = {
    id: 'fallback',
    name: 'fallback',
    supports: () => true,
    async read() {
      fallbackReads++
      throw new Error('must not run')
    },
  }
  const controller = createProviderLimitsController([usage.adapter, fallback], () => usage.target(model))

  await controller.refresh()
  expect(controller.snapshot()?.workspaceId).toBe(hostUsage.workspace.id)
  for (const [status, availability] of [
    [401, 'unauthenticated'],
    [403, 'permission_required'],
    [429, 'rate_limited'],
  ] as const) {
    h.setRead(async () => {
      throw { status }
    })
    await controller.refresh(true)
    expect(controller.snapshot()?.availability).toBe(availability)
  }
  h.setRead(async () => ({ location: { directory: '/synthetic' }, data: null }))
  await controller.refresh(true)
  expect(controller.snapshot()?.availability).toBe('unauthenticated')
  expect(fallbackReads).toBe(0)
  expect(usage.adapter.supports({ ...model, providerID: 'unrelated' })).toBe(false)
  controller.dispose()
})

test('native account switches reject stale reads and unrelated provider observations do not refresh usage', async () => {
  const h = fixture()
  const usage = createOpenCodeUsageAdapter(h.context)
  let resolve!: (value: unknown) => void

  h.setRead(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const before = usage.target(model).quotaContext
  const read = usage.adapter.read(model, new AbortController().signal)

  h.handlers.get('credential.switched')!({ data: { integrationID: 'opencode', credentialID: 'new-account' } })
  resolve({ location: { directory: '/synthetic' }, data: hostUsage })
  await expect(read).rejects.toThrow('target changed')
  expect(usage.target(model).quotaContext).not.toBe(before)
  expect(h.count()).toBe(1)
  expect(h.handlers.has('provider.updated')).toBe(false)
  h.handlers.get('credential.switched')!({ data: { integrationID: 'unrelated' } })
  expect(h.count()).toBe(1)
  usage.adapter.dispose?.()
  expect(h.handlers.size).toBe(0)
})

test('foreign integration events preserve in-flight native workspace usage while global credentials still invalidate it', async () => {
  const h = fixture()
  const usage = createOpenCodeUsageAdapter(h.context)
  let finish!: (value: unknown) => void

  h.setRead(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  try {
    const reading = usage.adapter.read(model, new AbortController().signal)

    h.handlers.get('integration.updated')?.({ location: { directory: '/other-workspace' } })
    finish({ location: { directory: '/synthetic' }, data: hostUsage })
    expect((await reading).workspaceId).toBe(hostUsage.workspace.id)
    const stale = usage.adapter.read(model, new AbortController().signal)

    h.handlers.get('credential.updated')?.({ location: { directory: '/other-workspace' } })
    finish({ location: { directory: '/synthetic' }, data: hostUsage })
    await expect(stale).rejects.toThrow('Workspace usage target changed')
    expect(h.count()).toBe(2)
  } finally {
    usage.adapter.dispose?.()
  }
})

test('network failures retain the previous snapshot through the controller error lifecycle', async () => {
  const h = fixture()
  const usage = createOpenCodeUsageAdapter(h.context)
  const controller = createProviderLimitsController([usage.adapter], () => usage.target(model))

  await controller.refresh()
  const previous = controller.snapshot()

  h.setRead(async () => {
    throw new Error('network unavailable')
  })
  await controller.refresh(true)
  expect(controller.snapshot()).toBe(previous)
  expect(controller.state().status).toBe('error')
  controller.dispose()
})
