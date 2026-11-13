import { providerQuotaCapability } from './provider-capabilities'

import type { ProviderQuotaSnapshot, SelectedModel } from '../../../entities/provider-limit/model'
import type { TargetRequestState } from '../../../shared/lib/request-state'

export function quotaStatusMessage(input: {
  model?: SelectedModel
  snapshot?: ProviderQuotaSnapshot
  state: TargetRequestState
  hasAdapter: boolean
  showUpdatedAt?: boolean
  providerName?: string
}) {
  const { model, snapshot, state } = input

  if (state.status === 'error') return snapshot ? 'Stale · refresh failed' : 'Quota read failed · refresh to retry'

  if (snapshot?.availability === 'ready' && (snapshot.windows.length > 0 || snapshot.balances?.length))
    return input.showUpdatedAt
      ? `${input.providerName ?? snapshot.providerName} · Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString()}`
      : undefined

  if (snapshot?.message) {
    if (snapshot.availability === 'stale') return `Stale · ${snapshot.message}`

    return snapshot.availability === 'ready'
      ? `Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString()} · ${snapshot.message}`
      : snapshot.message
  }

  const connection = model?.hostConnection

  if (connection?.status === 'loading') return 'Checking the OpenCode account…'

  if (connection?.status === 'unavailable') return 'Account metadata unavailable · refresh to retry'

  if (connection?.status === 'unsupported') return 'Codex quotas require an active ChatGPT OAuth connection'

  if (!snapshot) {
    if (state.status === 'loading') return 'Reading provider limits…'

    return input.hasAdapter
      ? 'Refresh to read provider limits'
      : providerQuotaCapability(model?.providerID ?? '').reason
  }

  if (snapshot.availability === 'unauthenticated')
    return model?.accountSource === 'host'
      ? 'Sign in to Codex CLI with the account selected in OpenCode'
      : 'Codex sign-in or linked account changed · relink below'

  if (snapshot.availability === 'unsupported') return 'No documented quota bucket for this model'

  if (snapshot.availability === 'rate_limited') return 'Provider rate-limited this read · try again later'

  if (snapshot.availability === 'stale') return 'Stale provider data · refresh to update'

  return `Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString()}`
}
