import { Show } from 'solid-js'

import { providerQuotaCapability } from '../../../features/provider-limits'

import type { createProviderLimitsController } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function LimitsStatus(props: {
  api: TuiPluginApi
  controller: ReturnType<typeof createProviderLimitsController>
}) {
  const message = () => {
    const model = props.controller.current().model
    const connection = model?.hostConnection
    const snapshot = props.controller.snapshot()
    const state = props.controller.state()

    if (state.status === 'error') return snapshot ? 'Stale · refresh failed' : 'Quota read failed · refresh to retry'

    if (snapshot?.availability === 'ready' && (snapshot.windows.length > 0 || snapshot.balances?.length)) return

    if (snapshot?.message)
      return snapshot.availability === 'stale'
        ? `Stale · ${snapshot.message}`
        : snapshot.availability === 'ready'
          ? `Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString()} · ${snapshot.message}`
          : snapshot.message

    if (connection?.status === 'loading') return 'Checking the OpenCode account…'

    if (connection?.status === 'unavailable') return 'Account metadata unavailable · refresh to retry'

    if (connection?.status === 'unsupported') return 'Codex quotas require an active ChatGPT OAuth connection'

    if (!snapshot)
      return state.status === 'loading'
        ? 'Reading provider limits…'
        : props.controller.current().adapter
          ? 'Refresh to read provider limits'
          : providerQuotaCapability(model?.providerID ?? '').reason

    const availability = snapshot.availability

    if (availability === 'unauthenticated')
      return model?.accountSource === 'host'
        ? 'Sign in to Codex CLI with the account selected in OpenCode'
        : 'Codex sign-in or linked account changed · relink below'

    if (availability === 'unsupported') return 'No documented quota bucket for this model'

    if (availability === 'rate_limited') return 'Provider rate-limited this read · try again later'

    if (availability === 'stale') return 'Stale provider data · refresh to update'

    return `Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString()}`
  }

  return (
    <Show when={props.controller.current().model && message()}>
      {(value) => (
        <text fg={props.api.theme.current.textMuted} wrapMode="word">
          {value()}
        </text>
      )}
    </Show>
  )
}
