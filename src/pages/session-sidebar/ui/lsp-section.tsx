import { For, Show, createMemo } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { createListVisibility } from '../../../shared/lib/list-visibility'
import { currentLocation } from '../../../shared/lib/location'

import { ListVisibilityControl } from './list-visibility'
import { LspBadge } from './lsp-badge'
import { Section } from './section'

import type { PreferencesController } from '../../../entities/preferences'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi, TuiSidebarLspItem } from '@opencode-ai/plugin/tui'

export function LspSection(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  interaction?: SidebarInteraction
  navigationSection?: number
}) {
  const list = createMemo(() =>
    [...props.api.state.lsp()].sort(
      (a, b) =>
        Number(b.status === 'error') - Number(a.status === 'error') ||
        a.id.localeCompare(b.id) ||
        a.root.localeCompare(b.root),
    ),
  )
  const visibility = createListVisibility({
    items: list,
    limit: () => props.preferences.sectionItemLimit?.('lsp') ?? 0,
    resetKey: () => currentLocation(props.api).key,
  })
  const connected = createMemo(() => list().filter((item) => item.status === 'connected').length)
  const disabled = createMemo(() => props.api.state.config.lsp === false)
  const navigationSection = () => props.navigationSection ?? 5

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.lsp`}
      navigationSection={navigationSection()}
      title="LSP"
      section="lsp"
      summary={`${connected()}/${list().length}`}
      open={props.preferences.expanded().lsp}
      onToggle={() => props.preferences.toggleSectionExpanded('lsp')}
    >
      <Show
        when={list().length > 0}
        fallback={
          <text fg={props.api.theme.current.textMuted}>
            {disabled() ? 'LSP is disabled' : 'Activates as files are read'}
          </text>
        }
      >
        <box flexDirection="row" flexWrap="wrap" gap={1} paddingLeft={1} paddingRight={1}>
          <For each={visibility.visible()}>
            {(item: TuiSidebarLspItem, index) => (
              <LspBadge
                api={props.api}
                interaction={props.interaction}
                id={item.id}
                navigationId={`${PLUGIN_ID}.lsp.${item.id}.${item.root}`}
                position={{ section: navigationSection(), row: 10, column: index() }}
                status={item.status}
              />
            )}
          </For>
        </box>
      </Show>
      <ListVisibilityControl
        api={props.api}
        interaction={props.interaction}
        section="lsp"
        navigationSection={navigationSection()}
        row={11}
        visibility={visibility}
      />
    </Section>
  )
}
