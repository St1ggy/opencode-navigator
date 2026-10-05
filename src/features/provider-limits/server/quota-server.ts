import { NavigatorQuotaRpc, normalizeProviderQuota } from '../../../entities/provider-limit/server'
import { providerQuotaCatalog } from '../model/provider-capabilities'

import { createNativeQuotaService } from './quota-service'

import type { ReadTarget } from './quota-service'
import type { Context } from '@opencode/plugin/promise/plugin'

export async function setupProviderQuotaServer(host: Context) {
  const lifecycle = new AbortController()
  const service = createNativeQuotaService(host, lifecycle.signal)
  const rpc = await host.rpc.register(NavigatorQuotaRpc, {
    read: async (input, context) => normalizeProviderQuota(await service.read(input as ReadTarget, context.signal)),
    capabilities: async () => {
      const providers = await host.provider.list()

      return providerQuotaCatalog(providers.data)
    },
  })
  const request = await host.session.hook('http.request', (event) => service.request(event))
  const response = await host.session.hook('http.response', async (event) => {
    if (await service.response(event))
      await rpc.events.emit('updated', { providerID: event.model.providerID, modelID: event.model.id }).catch(() => {})
  })

  void (async () => {
    const events = host.event.subscribe({ signal: lifecycle.signal })

    for await (const event of events) {
      if (['credential.updated', 'credential.switched', 'integration.updated', 'provider.updated'].includes(event.type))
        service.invalidate()
    }
  })().catch(() => {})

  return async () => {
    lifecycle.abort()
    await request.dispose()
    await response.dispose()
    await rpc.dispose()
    await service.dispose()
  }
}
