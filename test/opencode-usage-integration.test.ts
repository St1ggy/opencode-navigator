import { expect, test } from 'bun:test'

import metadata from '../package.json'
import { createProviderQuotaIntegration } from '../src/app/provider-quota'

import { hostUsage } from './fixtures/host-usage'
import { nativeHostFixture } from './fixtures/native-host'

import type { PreferencesController } from '../src/entities/preferences'

test('Console integration uses the host usage API without RPC reads, credentials, or Codex discovery', async () => {
  const h = nativeHostFixture()
  let nativeReads = 0
  let forbiddenReads = 0
  const forbidden = async () => {
    forbiddenReads++
    throw new Error('Native usage must not read credentials or RPC')
  }

  Object.assign(h.context.client, {
    usage: {
      limits: async () => {
        nativeReads++

        return { location: { directory: '/synthetic' }, data: hostUsage }
      },
    },
    rpc: () => ({ read: forbidden, events: { on: () => () => {} } }),
    provider: { get: forbidden },
    credential: { list: forbidden },
  })
  Object.assign(h.context.data.location, {
    provider: { list: () => [{ id: 'console', name: 'Console', integrationID: 'opencode' }] },
    model: { list: () => [] },
  })
  Object.assign(h.context.ui, { model: { current: () => ({ providerID: 'console', modelID: 'model' }) } })
  const integration = createProviderQuotaIntegration(h.api, {} as PreferencesController, metadata.version, h.context)
  const selected = integration.selectModel()!

  await integration.accountSource!.refresh(selected)
  await integration.controller.refresh(true)
  expect(integration.controller.current().adapter?.id).toBe('opencode-usage')
  expect(integration.controller.snapshot()?.workspaceId).toBe(hostUsage.workspace.id)
  expect(nativeReads).toBe(1)
  expect(forbiddenReads).toBe(0)
  h.emit('provider.updated', {})
  expect(nativeReads).toBe(1)
  expect(forbiddenReads).toBe(0)
  integration.controller.dispose()
  integration.accountSource?.dispose()
  await h.dispose()
})
