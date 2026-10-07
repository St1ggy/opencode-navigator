import { expect, test } from 'bun:test'

import { createOpenCodeV2AccountSource } from '../src/app/opencode-v2/account-source'

import type { SelectedModel } from '../src/entities/provider-limit'
import type { CredentialEntry, ProviderInfo } from '@opencode/client'
import type { Plugin } from '@opencode/plugin/tui'

const model: SelectedModel = { providerID: 'openai', modelID: 'synthetic-model', sessionID: 'one' }

function harness() {
  const callbacks = new Map<string, () => void>()
  let provider: ProviderInfo = {
    id: 'openai',
    name: 'OpenAI',
    integrationID: 'openai',
    activation: 'auto',
    package: '@ai-sdk/openai',
    headers: { 'chatgpt-account-id': 'account-a' },
  }
  let credentials: CredentialEntry[] = [
    {
      id: 'one',
      integrationID: 'openai',
      label: 'Private label',
      active: true,
      value: {
        type: 'oauth',
        methodID: 'chatgpt-browser',
        expires: 1,
        metadata: { accountID: 'account-a' },
        get access(): string {
          throw new Error('Access tokens must not be inspected')
        },
        get refresh(): string {
          throw new Error('Refresh tokens must not be inspected')
        },
      },
    },
  ]
  const context = {
    location: { directory: '/synthetic-workspace' },
    client: { provider: { get: async () => ({ data: provider }) }, credential: { list: async () => credentials } },
    data: {
      on: (event: string, callback: () => void) => {
        callbacks.set(event, callback)

        return () => callbacks.delete(event)
      },
    },
  } as unknown as Plugin.Context
  const source = createOpenCodeV2AccountSource(context, new AbortController().signal)

  return {
    source,
    context,
    callbacks,
    setProvider(value: ProviderInfo) {
      provider = value
    },
    setCredentials(value: CredentialEntry[]) {
      credentials = value
    },
    provider: () => provider,
    credentials: () => credentials,
  }
}

test('the host source extracts only account metadata and shares it across selected models', async () => {
  const h = harness()

  try {
    expect(h.source.current(model).hostConnection?.status).toBe('loading')
    await h.source.refresh(model)
    const selected = h.source.current(model)

    expect(selected.hostConnection).toEqual({
      status: 'ready',
      id: 'credential:one',
      accountID: 'account-a',
      method: 'oauth',
      providerID: 'openai',
    })
    expect(h.source.current({ ...model, modelID: 'another-model' }).hostConnection).toEqual(selected.hostConnection)
    expect(await h.source.validate({ ...selected, accountID: 'account-a' }, new AbortController().signal)).toBe(true)
    expect(JSON.stringify(selected)).not.toContain('Private label')
  } finally {
    h.source.dispose()
  }
  expect(h.callbacks.size).toBe(0)
})

test('account switches eagerly invalidate old targets and live validation rejects stale connections', async () => {
  const h = harness()

  try {
    await h.source.refresh(model)
    const previous = { ...h.source.current(model), accountID: 'account-a' }

    h.setCredentials([
      {
        ...h.credentials()[0],
        id: 'two',
        value: {
          type: 'oauth',
          methodID: 'chatgpt-browser',
          access: 'synthetic-access',
          refresh: 'synthetic-refresh',
          expires: 1,
          metadata: { accountID: 'account-b' },
        },
      },
    ])
    h.setProvider({ ...h.provider(), headers: { 'chatgpt-account-id': 'account-b' } })
    h.callbacks.get('credential.switched')?.()
    expect(h.source.current(model).hostConnection?.status).toBe('loading')
    await h.source.refresh(model)
    expect(await h.source.validate(previous, new AbortController().signal)).toBe(false)
    expect(h.source.current(model).hostConnection?.accountID).toBe('account-b')
  } finally {
    h.source.dispose()
  }
})

test('provider metadata observations preserve the active identity until a real account change is confirmed', async () => {
  const h = harness()

  try {
    await h.source.refresh(model)
    const previous = h.source.current(model)

    h.callbacks.get('provider.updated')?.()
    expect(h.source.current(model).hostConnection).toEqual(previous.hostConnection)
    await h.source.refresh(model)
    expect(h.source.current(model).hostConnection).toEqual(previous.hostConnection)
    h.setCredentials([{ ...h.credentials()[0], id: 'two' }])
    h.callbacks.get('provider.updated')?.()
    await h.source.refresh(model)
    expect(h.source.current(model).hostConnection?.id).toBe('credential:two')
    expect(await h.source.validate(previous, new AbortController().signal)).toBe(false)
  } finally {
    h.source.dispose()
  }
})

test('an API key, ambiguous active accounts, and stale catalog headers never automatically match Codex', async () => {
  const h = harness()

  try {
    h.setCredentials([{ ...h.credentials()[0], value: { type: 'key', key: 'synthetic-key' } }])
    await h.source.refresh(model)
    expect(h.source.current(model).hostConnection).toMatchObject({ status: 'ready', method: 'api' })
    expect(h.source.current(model).hostConnection?.accountID).toBeUndefined()
    h.setCredentials([h.credentials()[0], { ...h.credentials()[0], id: 'two' }])
    await h.source.refresh(model)
    expect(h.source.current(model).hostConnection?.status).toBe('unavailable')
    h.setCredentials([
      {
        ...h.credentials()[0],
        value: {
          type: 'oauth',
          methodID: 'chatgpt-browser',
          access: 'synthetic-access',
          refresh: 'synthetic-refresh',
          expires: 1,
          metadata: { accountID: 'new-account' },
        },
      },
    ])
    await h.source.refresh(model)
    expect(h.source.current(model).hostConnection?.status).toBe('loading')
  } finally {
    h.source.dispose()
  }
})
