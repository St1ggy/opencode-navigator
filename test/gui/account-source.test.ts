import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { createGuiAccountSource } from '../../src/app/gui/adapters/account-source'
import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'

import type { Context, MountedSession } from '@opencode/plugin/gui'

test('GUI account observations use sanitized main IPC and ignore foreign-directory catalog updates', async () => {
  const callbacks = new Map<string, (event?: { location?: { directory: string } }) => void>()
  let reads = 0
  let accountID = 'account-a'
  const session = {
    id: 'session',
    directory: '/synthetic/project',
    location: { directory: '/synthetic/project' },
    visit: {},
    server: {
      id: 'sidecar',
      local: true,
      connected: true,
      compatible: true,
      client: {},
      data: {
        on: (event: string, callback: (event?: { location?: { directory: string } }) => void) => {
          callbacks.set(event, callback)

          return () => callbacks.delete(event)
        },
      },
    },
  }
  const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
  const context = {
    id: 'synthetic',
    sessions: { current: () => session },
    main: () => ({
      read: async () => {
        reads++

        return { status: 'ready', id: 'credential:selected', accountID, method: 'oauth', providerID: 'openai' }
      },
    }),
  } as unknown as Context
  const root = createRoot((dispose) => ({
    dispose,
    source: createGuiAccountSource(context, access, access.capture()!, new AbortController().signal)!,
  }))
  const model = { providerID: 'openai', modelID: 'synthetic', sessionID: 'session', quotaContext: 'sidecar-visit' }

  try {
    root.source.current(model)
    await root.source.refresh(model)
    expect(root.source.current(model).hostConnection?.accountID).toBe('account-a')
    callbacks.get('provider.updated')?.({ location: { directory: '/synthetic/other' } })
    callbacks.get('integration.updated')?.({ location: { directory: '/synthetic/other' } })
    expect(reads).toBe(1)
    accountID = 'account-b'
    callbacks.get('credential.switched')?.()
    await root.source.refresh(model)
    expect(root.source.current(model).hostConnection?.accountID).toBe('account-b')
    const expected = { ...root.source.current(model), accountID: 'account-b' }

    session.visit = {}
    expect(await root.source.validate(expected, new AbortController().signal)).toBe(false)
    session.server.local = false
    expect(createGuiAccountSource(context, access, access.capture()!, new AbortController().signal)).toBeUndefined()
  } finally {
    root.source.dispose()
    root.dispose()
  }
  expect(callbacks.size).toBe(0)
})
