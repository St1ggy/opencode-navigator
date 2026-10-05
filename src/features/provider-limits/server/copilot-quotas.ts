import { createCopilotRuntime } from './copilot-runtime'

import type { NativeQuotaRequest } from './native-context'
import type { ProviderQuotaSnapshot } from '../../../entities/provider-limit'
import type * as CopilotSDK from '@github/copilot-sdk'

export function createCopilotQuotaReader(
  load: () => Promise<typeof CopilotSDK> = () => import('@github/copilot-sdk'),
  timeoutMs = 10_000,
) {
  const runtime = createCopilotRuntime(load, timeoutMs)

  return {
    async read(input: NativeQuotaRequest): Promise<ProviderQuotaSnapshot> {
      const [catalog, quota] = await runtime.use(input.signal, (sdk) =>
        Promise.all([
          sdk.rpc.models.list({ gitHubToken: input.token }),
          sdk.rpc.account.getQuota({ gitHubToken: input.token }),
        ]),
      )
      const selected = catalog.models.find((model) => model.id === input.apiModelID)
      const premium = quota.quotaSnapshots.premium_interactions
      const base = {
        model: input.model,
        providerId: input.model.providerID,
        providerName: input.provider.name,
        fetchedAt: Date.now(),
        windows: [] as ProviderQuotaSnapshot['windows'][number][],
      }

      input.signal.throwIfAborted()

      if (!selected || !selected.billing || (!selected.billing.tokenPrices && (selected.billing.multiplier ?? 0) <= 0))
        return {
          ...base,
          availability: 'unsupported',
          message: 'Copilot did not associate the selected model with a premium billing allowance.',
        }

      if (!premium)
        return {
          ...base,
          availability: 'unavailable',
          message: 'Copilot did not report a premium allowance; missing details are not zero.',
        }

      if (premium.isUnlimitedEntitlement)
        return {
          ...base,
          availability: 'ready',
          message: 'Copilot reports an unlimited premium entitlement for this account.',
        }

      const reset = premium.resetDate ? Date.parse(premium.resetDate) / 1000 : undefined

      if (!Number.isFinite(premium.remainingPercentage))
        return { ...base, availability: 'unavailable', message: 'Copilot quota percentage is unavailable.' }

      return {
        ...base,
        availability: 'ready',
        windows: [
          {
            id: 'copilot-premium',
            label: 'Premium allowance',
            modelID: input.model.modelID,
            kind: 'subscription',
            unit: '%',
            used: 100 - premium.remainingPercentage,
            remaining: premium.remainingPercentage,
            ...(reset !== undefined && Number.isFinite(reset) && { resetsAt: reset }),
          },
        ],
      }
    },
    dispose: runtime.dispose,
  }
}
