import { Show } from 'solid-js'

import { quotaStatusMessage } from '../../../features/provider-limits/model'

import type { createProviderLimitsController } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function LimitsStatus(props: {
  api: TuiPluginApi
  controller: ReturnType<typeof createProviderLimitsController>
}) {
  const message = () => {
    const { model, adapter } = props.controller.current()

    return quotaStatusMessage({
      model,
      snapshot: props.controller.snapshot(),
      state: props.controller.state(),
      hasAdapter: Boolean(adapter),
    })
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
