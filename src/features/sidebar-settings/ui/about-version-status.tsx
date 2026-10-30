import { TextAttributes } from '@opentui/core'
import { Show } from 'solid-js'

import { getNavigatorAboutServices } from '../model/about-services'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function AboutVersionStatus(props: { api: TuiPluginApi }) {
  const service = () => getNavigatorAboutServices(props.api)
  const status = () => {
    const state = service()?.checkState()

    if (!state) return 'Version information is loading…'

    switch (state.status) {
      case 'checking': {
        return 'Checking for Navigator updates…'
      }

      case 'current': {
        return 'Navigator is up to date.'
      }

      case 'available': {
        return `Navigator ${state.latest} is available.`
      }

      case 'error': {
        return 'Could not check updates. Check again to retry.'
      }

      case 'idle': {
        return 'Updates have not been checked yet.'
      }
    }
  }

  return (
    <box width="100%" minWidth={0} gap={0}>
      <text height={1} truncate wrapMode="none" attributes={TextAttributes.BOLD} fg={props.api.theme.current.text}>
        Navigator {service()?.navigatorVersion ?? 'version unavailable'}
      </text>
      <text height={1} truncate wrapMode="none" fg={props.api.theme.current.textMuted}>
        OpenCode {service()?.openCodeVersion ?? props.api.app?.version ?? 'version unavailable'}
      </text>
      <text
        height={1}
        truncate
        wrapMode="none"
        fg={
          service()?.checkState().status === 'error'
            ? props.api.theme.current.warning
            : props.api.theme.current.textMuted
        }
      >
        {service()?.updating() ? 'Installing Navigator. Restart OpenCode after completion.' : status()}
      </text>
      <text height={1} truncate wrapMode="none" fg={props.api.theme.current.textMuted}>
        {service()?.checkState().checkedAt
          ? `Last check: ${new Date(service()!.checkState().checkedAt!).toLocaleTimeString()}`
          : 'Check manually when needed.'}
      </text>
      <Show when={service()?.installed?.()}>
        {(version) => (
          <text height={1} truncate wrapMode="none" fg={props.api.theme.current.textMuted}>
            Restart OpenCode to use Navigator {version()}.
          </text>
        )}
      </Show>
    </box>
  )
}
