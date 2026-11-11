import { expect, test } from 'bun:test'

import { createGuiCodexAdapter } from '../../src/app/gui/adapters/codex'
import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'

import type { ProviderAccountSource, SelectedModel } from '../../src/entities/provider-limit/model'
import type { Context, MountedSession } from '@opencode/plugin/gui'

test('GUI Codex IPC rejects late model switches and never substitutes a local account for a remote target', async () => {
  const session = {
    id: 'session',
    directory: '/synthetic',
    location: { directory: '/synthetic' },
    visit: {},
    server: { id: 'sidecar', local: true, connected: true, compatible: true, client: {}, data: {} },
  }
  const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
  let model: SelectedModel = {
    providerID: 'openai',
    modelID: 'synthetic',
    sessionID: 'session',
    accountID: 'account-a',
    hostConnection: {
      status: 'ready',
      id: 'credential:selected',
      method: 'oauth',
      providerID: 'openai',
      accountID: 'account-a',
    },
  }
  let resolve!: (value: string) => void
  let calls = 0
  const context = {
    sessions: { current: () => session },
    id: 'synthetic',
    main: () => ({
      read: async () => {
        calls++

        return new Promise<string>((done) => {
          resolve = done
        })
      },
    }),
  } as unknown as Context
  const adapter = createGuiCodexAdapter(context, access, access.capture()!, () => model, {
    validate: async () => true,
  } as unknown as ProviderAccountSource)
  const signal = new AbortController().signal
  const request = adapter.read(model, signal)

  model = { ...model, modelID: 'changed' }
  resolve(
    JSON.stringify({
      providerId: 'codex',
      providerName: 'Codex CLI',
      fetchedAt: 1,
      availability: 'ready',
      windows: [],
    }),
  )
  await expect(request).rejects.toThrow('target changed')
  expect(calls).toBe(1)
  session.server.local = false
  expect(adapter.supports(model)).toBe(false)
  await expect(adapter.read(model, signal)).rejects.toThrow('target changed')
  expect(calls).toBe(1)
})
