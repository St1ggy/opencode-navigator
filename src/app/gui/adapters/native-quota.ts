import { normalizeProviderQuota } from '../../../entities/provider-limit/model'
import { NavigatorQuotaRpc } from '../../../entities/provider-limit/server'

import type { ProviderQuotaAdapter, ProviderQuotaSnapshot } from '../../../entities/provider-limit/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

export function createGuiNativeQuotaAdapter(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
): ProviderQuotaAdapter {
  return {
    id: 'provider-api',
    name: 'Provider-native quotas',
    supports: (model) => model.hostConnection?.status !== 'loading',
    async read(model, signal, force) {
      const request = access.read(scope)
      const base = {
        model,
        providerId: model.providerID,
        providerName: model.providerID,
        fetchedAt: Date.now(),
        windows: [],
      }

      try {
        const value = (await request.client.rpc(NavigatorQuotaRpc).read(
          {
            providerID: model.providerID,
            modelID: model.modelID,
            sessionID: model.sessionID,
            ...(model.variant && { variant: model.variant }),
            ...(model.hostConnection?.id && { connectionID: model.hostConnection.id }),
            force,
          },
          { location: request.location, signal },
        )) as ProviderQuotaSnapshot

        signal.throwIfAborted()

        if (!request.current()) throw new DOMException('Provider quota connection changed', 'AbortError')

        if (model.hostConnection?.id && value.connectionID && value.connectionID !== model.hostConnection.id)
          return {
            ...base,
            availability: 'unauthenticated',
            message: 'The provider connection changed during this read.',
          }

        return normalizeProviderQuota({ ...value, model })
      } catch (error) {
        signal.throwIfAborted()

        if (!request.current()) throw new DOMException('Provider quota connection changed', 'AbortError')

        if (!error || typeof error !== 'object' || !('type' in error) || error.type !== 'rpc.unavailable') throw error

        return {
          ...base,
          availability: 'setup_required',
          message: 'Enable the Navigator server plugin on the selected server to read provider quotas.',
        }
      }
    },
  }
}
