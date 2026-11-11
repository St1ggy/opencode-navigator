import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { createGuiLimits } from '../../src/app/gui/adapters/limits'
import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'

import type { PreferencesController } from '../../src/entities/preferences/model'
import type { Context, MountedSession } from '@opencode/plugin/gui'

test('local GUI Limits automatically verifies host account identity before reading account-scoped Codex quotas', async () => {
  const calls: string[] = []
  const session = {
    id: 'session',
    directory: '/synthetic',
    location: { directory: '/synthetic' },
    visit: {},
    server: {
      id: 'sidecar',
      local: true,
      connected: true,
      compatible: true,
      client: { rpc: () => ({ events: { on: () => () => {} } }) },
      data: { on: () => () => {} },
    },
  }
  const context = {
    id: 'synthetic',
    sessions: { current: () => session },
    screen: { current: () => ({ composer: { model: () => ({ providerID: 'openai', modelID: 'synthetic-model' }) } }) },
    main: (token: { id: string }) => ({
      read: async (target: unknown) => {
        calls.push(token.id)

        if (token.id.endsWith('.local-account'))
          return {
            status: 'ready',
            id: 'credential:selected',
            method: 'oauth',
            providerID: 'openai',
            accountID: 'account-a',
          }

        expect(target).toMatchObject({
          serverID: 'sidecar',
          providerID: 'openai',
          modelID: 'synthetic-model',
          accountID: 'account-a',
          connectionID: 'credential:selected',
        })

        return JSON.stringify({
          providerId: 'codex',
          providerName: 'Codex CLI',
          fetchedAt: 1,
          availability: 'ready',
          accountId: 'account-a',
          windows: [{ id: 'ordinary', label: 'Ordinary', scope: 'account', unit: '%', remaining: 70 }],
        })
      },
    }),
  } as unknown as Context
  const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
  const root = createRoot((dispose) => ({
    dispose,
    limits: createGuiLimits(context, access, access.capture()!, new AbortController().signal),
  }))

  try {
    await root.limits.accountSource!.refresh(root.limits.selected()!)
    await root.limits.controller.refresh()
    expect(root.limits.selected()?.accountSource).toBe('host')
    expect(root.limits.controller.snapshot()?.windows[0].scope).toBe('account')
    expect(calls).toEqual(['synthetic.local-account', 'synthetic.local-codex'])
  } finally {
    root.dispose()
  }
})

test('remote GUI quotas never consult a private local account binding with the same provider name', async () => {
  const session = {
    id: 'remote-session',
    directory: '/synthetic/remote',
    location: { directory: '/synthetic/remote' },
    visit: {},
    server: {
      id: 'remote-server',
      local: false,
      connected: true,
      compatible: true,
      data: {},
      client: {
        rpc: () => ({
          events: { on: () => () => {} },
          read: async () => ({
            providerId: 'openai',
            providerName: 'Remote OpenAI',
            fetchedAt: 1,
            availability: 'ready',
            accountId: 'remote-account',
            windows: [],
          }),
        }),
      },
    },
  }
  const context = {
    sessions: { current: () => session },
    screen: {
      current: () => ({
        composer: { model: () => ({ providerID: 'openai', modelID: 'synthetic-model' }) },
      }),
    },
  } as unknown as Context
  const preferences = {
    limitsRefreshMinutes: () => 5,
    codexAccountForConnection() {
      throw new Error('Remote targets must not consult local bindings')
    },
  } as unknown as PreferencesController
  const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
  const root = createRoot((dispose) => ({
    dispose,
    limits: createGuiLimits(context, access, access.capture()!, new AbortController().signal, preferences),
  }))

  try {
    await root.limits.controller.refresh()
    expect(root.limits.selected()?.accountID).toBeUndefined()
    expect(root.limits.selected()?.accountSource).toBeUndefined()
    expect(root.limits.codex).toBeUndefined()
    expect(root.limits.controller.snapshot()?.accountId).toBe('remote-account')
  } finally {
    root.dispose()
  }
})
