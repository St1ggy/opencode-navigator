import { Show } from 'solid-js'

import type { createProviderLimitsController } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function LimitsStatus(props: {
  api: TuiPluginApi
  controller: ReturnType<typeof createProviderLimitsController>
}) {
  const message = () => {
    const snapshot = props.controller.snapshot()
    const state = props.controller.state()

    if (state.status === 'error')
      return snapshot ? 'Stale · refresh failed; retry below' : 'Quota read failed · retry below'

    if (!snapshot) return state.status === 'loading' ? 'Reading provider limits…' : 'Refresh to read provider limits'

    const availability = snapshot.availability

    if (availability === 'unauthenticated') return 'Codex sign-in or linked account changed · relink below'

    if (availability === 'unsupported') return 'No documented quota bucket for this model'

    if (availability === 'rate_limited') return 'Provider rate-limited this read · try again later'

    if (availability === 'stale') return 'Stale provider data · refresh below'

    return `Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString()}`
  }

  return (
    <Show when={props.controller.current().adapter}>
      <text fg={props.api.theme.current.textMuted} wrapMode="word">
        {message()}
      </text>
    </Show>
  )
}
