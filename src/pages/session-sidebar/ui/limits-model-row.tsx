import { Show } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'

import { LimitsAction } from './limits-action'

import type { LimitsModelSelection, SelectedModel } from '../../../entities/provider-limit'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function LimitsModelRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  navigationSection: number
  model: SelectedModel
  selection?: LimitsModelSelection
}) {
  const names = () =>
    props.selection?.names(props.model) ?? { provider: props.model.providerID, model: props.model.modelID }

  return (
    <box flexDirection="row" minWidth={0}>
      <LimitsAction
        api={props.api}
        interaction={props.interaction}
        inline
        flexGrow={1}
        maxWidth={Bun.stringWidth(`[${names().provider}] ${names().model}`) + 2}
        id={`${PLUGIN_ID}.limits.model`}
        position={{ section: props.navigationSection, row: 1, column: 0 }}
        label={`[${names().provider}] ${names().model}`}
        disabled={!props.selection?.canOpen('model', props.model)}
        onActivate={() => props.selection?.open('model', props.model)}
      />
      <Show when={props.model.variant || props.selection?.variants(props.model).length}>
        <text fg={props.api.theme.current.textMuted} flexShrink={0}>
          {' '}
          ·{' '}
        </text>
        <LimitsAction
          api={props.api}
          interaction={props.interaction}
          inline
          id={`${PLUGIN_ID}.limits.variant`}
          position={{ section: props.navigationSection, row: 1, column: 1 }}
          label={props.model.variant ?? 'Default'}
          disabled={!props.selection?.canOpen('variant', props.model)}
          onActivate={() => props.selection?.open('variant', props.model)}
        />
      </Show>
    </box>
  )
}
