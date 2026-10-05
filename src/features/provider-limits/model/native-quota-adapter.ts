import { normalizeProviderQuota } from '../../../entities/provider-limit'
import { NavigatorQuotaRpc } from '../../../entities/provider-limit/server'

import { providerQuotaCatalog } from './provider-capabilities'

import type { ProviderQuotaAdapter, ProviderQuotaSnapshot } from '../../../entities/provider-limit'
import type { Plugin } from '@opencode/plugin/tui'

function missing(error: unknown) {
  return typeof error === 'object' && error !== null && 'type' in error && error.type === 'rpc.unavailable'
}

export function createNativeQuotaAdapter(context: Plugin.Context) {
  const rpc = context.client.rpc(NavigatorQuotaRpc)
  const listeners = new Set<(providerID: string, modelID: string) => void>()
  const unsubscribe = rpc.events.on('updated', (event) => {
    const location = context.location ?? context.data.location.default()

    if (event.location.directory !== location.directory) return

    if (typeof event.data.providerID !== 'string' || typeof event.data.modelID !== 'string') return

    for (const listener of listeners) listener(event.data.providerID, event.data.modelID)
  })
  const adapter: ProviderQuotaAdapter = {
    id: 'provider-api',
    name: 'Provider-native quotas',
    supports: (model) => model.hostConnection?.status !== 'loading',
    async read(model, signal, force) {
      const base: ProviderQuotaSnapshot = {
        model,
        providerId: model.providerID,
        providerName: model.providerID,
        availability: 'setup_required',
        fetchedAt: Date.now(),
        windows: [],
      }

      try {
        if (typeof rpc.read !== 'function')
          return {
            ...base,
            message: 'Enable the Navigator OpenCode 2 server plugin for native provider quotas and balances.',
          }

        const value = (await rpc.read(
          {
            providerID: model.providerID,
            modelID: model.modelID,
            sessionID: model.sessionID,
            ...(model.variant && { variant: model.variant }),
            ...(model.hostConnection?.id && { connectionID: model.hostConnection.id }),
            force,
          },
          { location: context.location ?? context.data.location.default(), signal },
        )) as unknown as ProviderQuotaSnapshot

        if (model.hostConnection?.id && value.connectionID && value.connectionID !== model.hostConnection.id)
          return {
            ...base,
            availability: 'unauthenticated',
            message: 'The provider connection changed during this read.',
          }

        return normalizeProviderQuota({
          model,
          providerId: value.providerId,
          providerName: value.providerName,
          availability: value.availability,
          fetchedAt: value.fetchedAt,
          windows: value.windows,
          ...(value.balances && { balances: value.balances }),
          ...(value.accountId && { accountId: value.accountId }),
          ...(value.connectionID && { connectionID: value.connectionID }),
          ...(value.message && { message: value.message }),
        })
      } catch (error) {
        if (!missing(error)) throw error

        return {
          ...base,
          message: 'Enable the Navigator OpenCode 2 server plugin for native provider quotas and balances.',
        }
      }
    },
    dispose() {
      unsubscribe()
      listeners.clear()
    },
  }

  return {
    adapter,
    onUpdated(listener: (providerID: string, modelID: string) => void) {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    async capabilities() {
      try {
        return (await rpc.capabilities({})) as unknown as ReturnType<typeof providerQuotaCatalog>
      } catch {
        return providerQuotaCatalog(context.data.location.provider?.list?.(context.location) ?? [])
      }
    },
  }
}
