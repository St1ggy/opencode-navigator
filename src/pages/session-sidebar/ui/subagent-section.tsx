import { For, Show } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { useIcons } from '../../../shared/ui'
import { createSubagentSectionModel } from '../model/subagent-section-model'

import { ListVisibilityControl } from './list-visibility'
import { McpBulkAction } from './mcp-bulk-action'
import { SectionRequestBody } from './request-body'
import { Section } from './section'
import { SectionFilter } from './section-filter'
import { SectionTab } from './section-tab'
import { SubagentList } from './subagent-list'

import type { PreferencesController } from '../../../entities/preferences'
import type { SubagentController } from '../../../entities/subagent'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SubagentSection(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: SubagentController
  preferences: PreferencesController
  sessionID: string
  navigationSection?: number
}) {
  const icons = useIcons()
  const model = createSubagentSectionModel(props)
  const navigationSection = () => props.navigationSection ?? 2

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.subagents`}
      navigationSection={navigationSection()}
      title="SUBAGENTS"
      section="subagents"
      summary={`${model.list().length} active · ${model.recent().length} recent`}
      open={props.preferences.expanded().subagents}
      onToggle={() => props.preferences.toggleSectionExpanded('subagents')}
    >
      <Show when={model.parentID()}>
        {(id) => (
          <McpBulkAction
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.subagents.parent`}
            position={{ section: navigationSection(), row: 1, column: 0 }}
            label={`${icons.icon('up')} Parent session`}
            disabled={false}
            onActivate={() => props.controller.open(id())}
          />
        )}
      </Show>
      <SectionRequestBody
        api={props.api}
        interaction={props.interaction}
        id={`${PLUGIN_ID}.retry.subagents`}
        position={{ section: navigationSection(), row: 2, column: 0 }}
        state={model.state()}
        hasItems={model.rows().length > 0}
        empty="No subagents"
        loading="Loading subagents…"
        onRetry={() => void props.controller.retry(props.sessionID)}
      >
        <box gap={1}>
          <SectionFilter
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.filter.subagents`}
            position={{ section: navigationSection(), row: 3, column: 0 }}
            query={model.query()}
            placeholder="Filter subagents..."
            onInput={model.setQuery}
          />
          <box flexDirection="row" flexWrap="wrap">
            <For each={model.tabs()}>
              {(value, index) => (
                <SectionTab
                  api={props.api}
                  interaction={props.interaction}
                  id={`${PLUGIN_ID}.subagents.filter.${value}`}
                  position={{ section: navigationSection(), row: 4, column: index() }}
                  label={value[0].toUpperCase() + value.slice(1)}
                  count={model.counts()[value]}
                  disabled={(value === 'active' || value === 'recent') && model.counts()[value] === 0}
                  selected={model.mode() === value}
                  onActivate={() => model.setMode(value)}
                />
              )}
            </For>
          </box>
          <Show when={model.filtered().length === 0}>
            <text fg={props.api.theme.current.textMuted}>No matching subagents</text>
          </Show>
          <SubagentList
            api={props.api}
            interaction={props.interaction}
            controller={props.controller}
            navigationSection={navigationSection()}
            ids={model.ids()}
            visible={model.visibility.visible()}
            itemById={(id) => model.byId().get(id)!}
            now={model.now()}
            density={props.preferences.rowDensity?.() ?? 'compact'}
          />
          <ListVisibilityControl
            api={props.api}
            interaction={props.interaction}
            section="subagents"
            navigationSection={navigationSection()}
            row={10 + model.visibility.visible().length}
            visibility={model.visibility}
          />
        </box>
      </SectionRequestBody>
    </Section>
  )
}
