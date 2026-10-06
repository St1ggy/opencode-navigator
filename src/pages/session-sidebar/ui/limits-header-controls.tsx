import { Show } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { useIcons } from '../../../shared/ui'

import { SectionHeaderControl } from './section-header-control'

import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function LimitsHeaderControls(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  navigationSection: number
  credits: boolean
  refreshing: boolean
  canRefresh: boolean
  onCredits: () => void
  onRefresh: () => void
}) {
  const icons = useIcons()

  return (
    <>
      <Show when={props.credits}>
        <SectionHeaderControl
          api={props.api}
          interaction={props.interaction}
          position={{ section: props.navigationSection, row: 0, column: 1 }}
          action={{
            id: `${PLUGIN_ID}.limits.credits`,
            label: () => 'Banked Resets',
            disabled: () => false,
            onActivate: props.onCredits,
          }}
        />
      </Show>
      <SectionHeaderControl
        api={props.api}
        interaction={props.interaction}
        iconOnly
        position={{ section: props.navigationSection, row: 0, column: 2 }}
        action={{
          id: `${PLUGIN_ID}.limits.refresh`,
          label: () => icons.icon(props.refreshing ? 'pending' : 'retry'),
          disabled: () => props.refreshing || !props.canRefresh,
          onActivate: props.onRefresh,
        }}
      />
    </>
  )
}
