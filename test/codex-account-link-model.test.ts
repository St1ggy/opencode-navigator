import { expect, test } from 'bun:test'

import { createPreferencesModel, emptyPreferencesDocument } from '../src/entities/preferences/model'
import { createCodexAccountLinkModel } from '../src/features/provider-limits/model'
import { pluginConfig } from '../src/shared/config'

import type { ProviderQuotaAdapter, SelectedModel } from '../src/entities/provider-limit/model'

test('shared Codex linking verifies the exact account again and rejects stale confirmations', async () => {
  let selected: SelectedModel = {
    providerID: 'openai',
    modelID: 'synthetic',
    sessionID: 'session',
    hostConnection: { status: 'ready', id: 'credential:selected', method: 'oauth', providerID: 'openai' },
  }
  let account = 'account-a'
  const bindings: unknown[] = []
  const adapter = {
    discoverAccount: async () => account,
    validateHost: async () => true,
  } as unknown as ProviderQuotaAdapter
  const model = createCodexAccountLinkModel({
    adapter,
    selected: () => selected,
    signal: new AbortController().signal,
    bind: (providerID, connectionID, accountID) => {
      bindings.push([providerID, connectionID, accountID])
    },
  })
  const preview = await model.discover()

  expect(preview?.accountID).toBe('account-a')
  account = 'account-b'
  expect(await model.confirm(preview!)).toBe(false)
  expect(bindings).toEqual([])
  account = 'account-a'
  expect(await model.confirm(preview!)).toBe(true)
  expect(bindings).toEqual([['openai', 'credential:selected', 'account-a']])
  selected = { ...selected, sessionID: 'other' }
  expect(await model.confirm(preview!)).toBe(false)
  expect(bindings).toHaveLength(1)
})

test('a failed authoritative account-binding save does not expose an optimistic link', async () => {
  const warnings: string[] = []
  const preferences = createPreferencesModel(
    {
      notifications: {
        show: (value) => {
          warnings.push(value.message)
        },
      },
      validKey: () => true,
    },
    pluginConfig({}),
    {
      load: async () => emptyPreferencesDocument(),
      update: async () => {
        throw new Error('Synthetic persistence failure')
      },
      flush: async () => {},
    },
  )

  await preferences.load()
  await Promise.resolve(
    expect(preferences.saveCodexConnectionBinding('openai', 'credential:selected', 'account-a')).rejects.toThrow(
      'Synthetic persistence failure',
    ),
  )
  expect(preferences.codexAccountForConnection('openai', 'credential:selected', 'synthetic')).toBeUndefined()
  expect(warnings).toEqual(['Synthetic persistence failure'])
})

test.each(['cancel', 'account-switch'])(
  'account confirmation rejects %s while verification is pending',
  async (change) => {
    const abort = new AbortController()
    let connectionID = 'credential:one'
    let resolve!: (account: string) => void
    let saves = 0
    const model = createCodexAccountLinkModel({
      adapter: {
        discoverAccount: () =>
          new Promise<string>((done) => {
            resolve = done
          }),
      } as unknown as ProviderQuotaAdapter,
      selected: () => ({
        providerID: 'openai',
        modelID: 'synthetic',
        sessionID: 'session',
        hostConnection: { status: 'ready', id: connectionID, method: 'oauth', providerID: 'openai' },
      }),
      signal: abort.signal,
      bind: () => {
        saves++
      },
    })
    const confirmation = model.confirm({ accountID: 'account-a' })

    // Discovery first awaits host validation, then waits for the account RPC.
    await Promise.resolve()

    if (change === 'cancel') abort.abort()
    else connectionID = 'credential:two'

    resolve('account-a')
    expect(await confirmation).toBe(false)
    expect(saves).toBe(0)
  },
)
