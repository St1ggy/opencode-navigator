import { expect, test } from 'bun:test'

import { createProviderAccountSource } from '../../src/features/provider-limits/model'

import type { HostProviderConnection } from '../../src/entities/provider-limit/model'

test('shared account source rejects late reads after server identity or lifecycle changes', async () => {
  const lifecycle = new AbortController()
  const model = { providerID: 'openai', modelID: 'synthetic', sessionID: 'session' }
  let server = 'remote-a'
  let resolve!: (value: HostProviderConnection) => void
  let cleaned = false
  const source = createProviderAccountSource({
    lifecycle: lifecycle.signal,
    key: (value) => JSON.stringify([server, value.providerID]),
    read: () =>
      new Promise((done) => {
        resolve = done
      }),
    subscribe: () => () => {
      cleaned = true
    },
  })

  try {
    const first = source.refresh(model)

    server = 'remote-b'
    resolve({ status: 'ready', id: 'credential:old', accountID: 'old-account' })
    await first
    expect(source.current(model).hostConnection?.status).toBe('loading')
    const second = source.refresh(model)

    lifecycle.abort()
    resolve({ status: 'ready', id: 'credential:late', accountID: 'late-account' })
    await second
    expect(source.current(model).hostConnection?.status).toBe('loading')
    expect(
      await source.validate(
        {
          ...model,
          accountID: 'late-account',
          hostConnection: { status: 'ready', id: 'credential:late', accountID: 'late-account' },
        },
        new AbortController().signal,
      ),
    ).toBe(false)
  } finally {
    source.dispose()
  }
  expect(cleaned).toBe(true)
})
