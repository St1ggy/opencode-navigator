import { For, Show, createMemo } from 'solid-js'

import {
  QUICK_ACTIONS,
  createQuickActionRevision,
  orderQuickActionIds,
  quickActionDisabledReason,
  quickActionLabel,
} from '../../../entities/quick-action'
import { PLUGIN_ID } from '../../../shared/config'
import { createListVisibility } from '../../../shared/lib/list-visibility'
import { currentLocation } from '../../../shared/lib/location'

import { ListVisibilityControl } from './list-visibility'
import { QuickActionRow } from './quick-action-row'
import { Section } from './section'
import { SidebarRowList } from './sidebar-row-list'

import type { PreferencesController } from '../../../entities/preferences'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function QuickActionsSection(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction?: SidebarInteraction
  navigationSection?: number
}) {
  const commandRevision = createQuickActionRevision(props.api)
  const actions = createMemo(() => {
    commandRevision()

    return orderQuickActionIds(
      props.preferences.quickActionOrder?.() ?? QUICK_ACTIONS.map((action) => action.command),
      props.preferences.favoriteQuickActions?.() ?? new Set(),
    ).flatMap((id) => {
      const action = QUICK_ACTIONS.find((candidate) => candidate.command === id)

      return action && props.preferences.quickActionVisible?.(id) !== false
        ? [
            {
              ...action,
              label: quickActionLabel(props.api, action),
              disabled: quickActionDisabledReason(props.api, action),
            },
          ]
        : []
    })
  })
  const visibility = createListVisibility({
    items: actions,
    limit: () => props.preferences.sectionItemLimit?.('quick_actions') ?? 0,
    resetKey: () => currentLocation(props.api).key,
  })
  const navigationSection = () => props.navigationSection ?? 4

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.quick_actions`}
      navigationSection={navigationSection()}
      title="QUICK ACTIONS"
      section="quick_actions"
      summary={String(actions().length)}
      open={props.preferences.expanded().quick_actions}
      onToggle={() => props.preferences.toggleSectionExpanded('quick_actions')}
    >
      <SidebarRowList density={props.preferences.rowDensity?.() ?? 'compact'}>
        <Show when={actions().length === 0}>
          <text fg={props.api.theme.current.textMuted}>No quick actions selected</text>
        </Show>
        <For each={visibility.visible()}>
          {(action, index) => (
            <QuickActionRow
              api={props.api}
              interaction={props.interaction}
              action={action}
              disabled={action.disabled}
              favorite={props.preferences.favoriteQuickActions?.().has(action.command) ?? false}
              favoriteDisabled={props.preferences.ready ? !props.preferences.ready() : false}
              separator={
                index() > 0 &&
                (props.preferences.favoriteQuickActions?.().has(visibility.visible()[index() - 1].command) ?? false) &&
                !(props.preferences.favoriteQuickActions?.().has(action.command) ?? false)
              }
              onToggleFavorite={() => props.preferences.toggleFavoriteQuickAction?.(action.command)}
              position={{ section: navigationSection(), row: 10 + index(), column: 0 }}
            />
          )}
        </For>
      </SidebarRowList>
      <ListVisibilityControl
        api={props.api}
        interaction={props.interaction}
        section="quick_actions"
        navigationSection={navigationSection()}
        row={10 + visibility.visible().length}
        visibility={visibility}
      />
    </Section>
  )
}
