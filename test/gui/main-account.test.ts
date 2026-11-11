import { expect, test } from 'bun:test'

import { createMainAccountReader } from '../../src/app/gui/adapters/main-account'
import { createMainCodexHandlers } from '../../src/app/gui/adapters/main-codex'
import { emptyPreferencesDocument } from '../../src/entities/preferences/model'

import type { CodexRpcClient } from '../../src/features/provider-limits/model'
import type { MainContext } from '@opencode/plugin/gui/main'

function fixture() {
  let calls = 0
  let sameMachine = true
  let directory = '/synthetic/project'
  let reconnect = false
  const client = {
    session: { get: async () => ({ id: 'session', location: { directory } }) },
    provider: {
      get: async () => {
        calls++

        if (reconnect) context.client = { ...client }

        return {
          data: {
            id: 'openai',
            integrationID: 'openai',
            activation: 'auto',
            headers: { 'chatgpt-account-id': 'account-a' },
          },
        }
      },
    },
    credential: {
      list: async () => [
        {
          id: 'selected',
          integrationID: 'openai',
          active: true,
          value: {
            type: 'oauth',
            methodID: 'chatgpt-browser',
            metadata: { accountID: 'account-a' },
            get access(): string {
              throw new Error('Provider access tokens must not be inspected')
            },
            get refresh(): string {
              throw new Error('Provider refresh tokens must not be inspected')
            },
          },
        },
      ],
    },
  }
  const context = {
    signal: new AbortController().signal,
    client,
    serverEndpoints: { get: (id: string) => ({ id, url: 'http://127.0.0.1:1234', sameMachine }) },
  }

  return {
    context: context as unknown as MainContext,
    read: createMainAccountReader(context as unknown as MainContext),
    calls: () => calls,
    setLocal(value: boolean) {
      sameMachine = value
    },
    setDirectory(value: string) {
      directory = value
    },
    reconnect() {
      reconnect = true
    },
  }
}

const target = { serverID: 'sidecar', sessionID: 'session', directory: '/synthetic/project', providerID: 'openai' }
const caller = () => ({ signal: new AbortController().signal })

test('Desktop main exposes only verified local connection metadata, never credential values', async () => {
  const context = fixture()

  expect(await context.read(target, caller())).toEqual({
    status: 'ready',
    id: 'credential:selected',
    method: 'oauth',
    providerID: 'openai',
    accountID: 'account-a',
  })
  expect(context.calls()).toBe(1)
  expect(await context.read({ ...target, serverID: 'remote' }, caller())).toEqual({ status: 'unsupported' })
  context.setLocal(false)
  expect(await context.read(target, caller())).toEqual({ status: 'unsupported' })
  expect(context.calls()).toBe(1)
})

test('Desktop Codex broker keeps remote targets away from local accounts and requires a persisted reset attempt', async () => {
  const context = fixture()
  const document = emptyPreferencesDocument()
  const requests: { method: string; params: unknown }[] = []
  let finish!: (value: { outcome: 'reset' }) => void
  let consuming!: () => void
  const started = new Promise<void>((resolve) => {
    consuming = resolve
  })
  const consumeResult = new Promise<{ outcome: 'reset' }>((resolve) => {
    finish = resolve
  })
  const client = {
    async request(method: string, params: unknown) {
      requests.push({ method, params })

      if (method === 'account/read') return { account: { type: 'chatgpt' } }

      if (method === 'account/rateLimits/read')
        return {
          accountId: 'account-a',
          ordinaryUsageAllowed: false,
          rateLimits: {
            limitId: 'codex',
            limitName: 'Codex',
            normalModelSlug: null,
            primary: { usedPercent: 100, windowDurationMins: 300, resetsAt: 1_800_000_000 },
            secondary: null,
          },
          rateLimitsByLimitId: null,
          rateLimitResetCredits: { availableCount: 1, credits: null },
        }

      consuming()

      return consumeResult
    },
    dispose() {},
  } as unknown as CodexRpcClient
  const handlers = createMainCodexHandlers(
    context.context,
    {
      load: async () => document,
      update: async () => {},
      flush: async () => {},
    },
    client,
  )
  const selected = {
    ...target,
    modelID: 'synthetic-model',
    accountID: 'account-a',
    connectionID: 'credential:selected',
  }

  await expect(handlers.read({ ...selected, serverID: 'remote' }, caller())).rejects.toThrow(
    'verified ChatGPT connection',
  )
  expect(requests).toHaveLength(0)
  const snapshot = JSON.parse(await handlers.read(selected, caller()))

  expect(snapshot.windows[0].scope).toBe('account')
  expect(snapshot.bankedResets.availableCount).toBe(1)
  expect(JSON.stringify(snapshot)).not.toMatch(/access|refresh|headers/iu)
  const consume = { target: selected, idempotencyKey: 'synthetic-idempotency', uncertain: false }

  await expect(handlers.consume(consume, caller())).rejects.toThrow('confirmed reset attempt')
  expect(requests.some((request) => request.method === 'account/rateLimitResetCredit/consume')).toBe(false)
  document.user.pendingResetAttempt = {
    providerID: selected.providerID,
    modelID: selected.modelID,
    accountID: selected.accountID,
    connectionID: selected.connectionID,
    idempotencyKey: consume.idempotencyKey,
    createdAt: 1,
  }
  const first = handlers.consume(consume, caller())

  await started
  const second = handlers.consume(consume, caller())

  // A completed read passes through the same metadata checks and a longer RPC chain.
  await handlers.read(selected, caller())
  finish({ outcome: 'reset' })
  expect(await Promise.all([first, second])).toEqual(['reset', 'reset'])
  expect(requests.filter((request) => request.method === 'account/rateLimitResetCredit/consume')).toEqual([
    { method: 'account/rateLimitResetCredit/consume', params: { idempotencyKey: consume.idempotencyKey } },
  ])
})

test('Desktop main rejects stale session locations and reconnects before exposing account identity', async () => {
  const context = fixture()

  context.setDirectory('/synthetic/other')
  await expect(context.read(target, caller())).rejects.toThrow('location changed')
  expect(context.calls()).toBe(0)
  context.setDirectory(target.directory)
  context.reconnect()
  await expect(context.read(target, caller())).rejects.toThrow('connection changed')
})
