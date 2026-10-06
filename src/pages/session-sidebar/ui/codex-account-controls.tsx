import { Show } from 'solid-js'

import { createCodexAccountLink } from '../../../features/provider-limits'
import { PLUGIN_ID } from '../../../shared/config'
import { useDialogs, useIcons } from '../../../shared/ui'

import { LimitsAction } from './limits-action'

import type { PreferencesController } from '../../../entities/preferences'
import type {
  ProviderQuotaAdapter,
  SelectedModel,
  createProviderLimitsController,
} from '../../../entities/provider-limit'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function CodexAccountControls(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  controller: ReturnType<typeof createProviderLimitsController>
  codex: ProviderQuotaAdapter
  interaction?: SidebarInteraction
  navigationSection: number
  model: SelectedModel
}) {
  const icons = useIcons()
  const model = () => props.controller.current().model
  const accountLink = createCodexAccountLink({
    api: props.api,
    preferences: props.preferences,
    adapter: props.codex,
    model,
    dialogs: useDialogs(props.api),
  })
  const eligible = () =>
    (props.model.providerID === 'openai' || props.model.hostConnection?.providerID === 'openai') &&
    props.model.hostConnection?.method !== 'api'
  const action = (id: string, row: number, label: string, onActivate: () => void) => (
    <LimitsAction
      api={props.api}
      interaction={props.interaction}
      id={`${PLUGIN_ID}.limits.${id}`}
      position={{ section: props.navigationSection, row, column: 0 }}
      label={label}
      onActivate={onActivate}
      disabled={accountLink.busy()}
    />
  )

  return (
    <Show when={eligible()}>
      <Show
        when={!props.model.accountID && (!props.model.hostConnection || props.model.hostConnection.status === 'ready')}
      >
        <text fg={props.api.theme.current.textMuted}>Link the matching Codex account once for this connection</text>
        {action('link', 2, `${icons.icon('scope')} Link Codex CLI account`, () => void accountLink.link())}
      </Show>
      <Show
        when={
          props.model.accountID &&
          props.model.accountSource !== 'host' &&
          props.controller.snapshot()?.availability === 'unauthenticated'
        }
      >
        {action('unlink', 4, `${icons.icon('close')} Unlink Codex account`, () =>
          props.preferences.setCodexConnectionBinding(props.model.providerID, props.model.hostConnection?.id),
        )}
        <Show when={props.controller.snapshot()?.availability === 'unauthenticated'}>
          {action('relink', 5, `${icons.icon('scope')} Relink Codex account`, () => void accountLink.link())}
        </Show>
      </Show>
    </Show>
  )
}
