import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import metadata from '../package.json'
import { createLimitsRefresh } from '../src/app/limits-refresh'
import { createProviderQuotaIntegration } from '../src/app/provider-quota'

import { nativeHostFixture } from './fixtures/native-host'

import type { PreferencesController } from '../src/entities/preferences'

test('native quota polling ignores unchanged provider observations and never uses a model client', async () => {
  const h = nativeHostFixture()
  const calls: string[] = []
  const reads: { connectionID?: string; force?: boolean }[] = []
  let credentialID = 'one'
  let forbiddenCalls = 0
  let tick!: () => void
  const [hostObservation, setHostObservation] = createSignal(0)
  const client = {
    usage: undefined,
    provider: {
      async get() {
        calls.push('provider.get')

        return { data: { id: 'deepseek', integrationID: 'deepseek', activation: 'auto' } }
      },
    },
    credential: {
      async list() {
        calls.push('credential.list')

        return [{ id: credentialID, integrationID: 'deepseek', active: true, value: { type: 'key' } }]
      },
    },
    rpc: () => ({
      events: { on: () => () => {} },
      async read(target: { connectionID?: string; force?: boolean }) {
        calls.push('quotas.read')
        reads.push(target)

        return {
          providerId: 'deepseek',
          providerName: 'DeepSeek',
          fetchedAt: 1,
          availability: 'ready',
          connectionID: target.connectionID,
          windows: [],
        }
      },
    }),
  }

  Object.assign(h.context, {
    client: new Proxy(client, {
      get(target, key) {
        if (key in target) return Reflect.get(target, key)

        forbiddenCalls++
        throw new Error(`Background quota refresh must not access client.${String(key)}`)
      },
    }),
  })
  Object.assign(h.context.ui, {
    model: {
      current() {
        hostObservation()

        return { providerID: 'deepseek', modelID: 'synthetic-model' }
      },
    },
  })
  const integration = createProviderQuotaIntegration(h.api, {} as PreferencesController, metadata.version, h.context)
  const dispose = createRoot((cleanup) => {
    createLimitsRefresh({ ...integration, selectedModel: integration.selectModel }, (callback, milliseconds) => {
      expect(milliseconds).toBe(300_000)
      tick = callback

      return () => {}
    })

    return cleanup
  })

  try {
    await Bun.sleep(0)
    expect(reads).toHaveLength(1)
    expect(reads[0].connectionID).toBe('credential:one')
    for (let pulse = 1; pulse <= 100; pulse++) setHostObservation(pulse)
    await Bun.sleep(0)
    expect(reads).toHaveLength(1)
    expect(calls.filter((call) => call === 'provider.get')).toHaveLength(1)
    for (let observation = 0; observation < 3; observation++) {
      h.emit('provider.updated', {})
      await Bun.sleep(0)
      expect(reads).toHaveLength(1)
      expect(integration.controller.snapshot()?.connectionID).toBe('credential:one')
    }

    tick()
    await Bun.sleep(0)
    expect(reads).toHaveLength(2)
    await integration.controller.refresh(true)
    expect(reads.map((read) => read.force)).toEqual([false, false, true])

    credentialID = 'two'
    h.emit('credential.switched', {})
    expect(integration.controller.snapshot()).toBeUndefined()
    await Bun.sleep(0)
    expect(reads).toHaveLength(4)
    expect(reads[3].connectionID).toBe('credential:two')
    expect(integration.controller.snapshot()?.connectionID).toBe('credential:two')
    expect(forbiddenCalls).toBe(0)
    expect(new Set(calls)).toEqual(new Set(['provider.get', 'credential.list', 'quotas.read']))
  } finally {
    dispose()
    integration.controller.dispose()
    integration.accountSource?.dispose()
    await h.dispose()
  }
})
