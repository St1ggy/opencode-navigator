import { For, Show } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'

import { ListVisibilityControl } from './list-visibility'
import { McpBulkControls } from './mcp-bulk-controls'
import { McpGroupHeader } from './mcp-group-header'
import { McpRow } from './mcp-row'
import { SectionRequestBody } from './request-body'
import { SectionFilter } from './section-filter'
import { SidebarRowList } from './sidebar-row-list'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { createMcpSectionModel } from '../model/mcp-section-model'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpSectionContent(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: McpController
  preferences: PreferencesController
  navigationSection: number
  query: string
  onQuery: (value: string) => void
  model: ReturnType<typeof createMcpSectionModel>
}) {
  const model = props.model

  return (
    <SectionRequestBody
      api={props.api}
      interaction={props.interaction}
      id={`${PLUGIN_ID}.retry.mcp`}
      position={{ section: props.navigationSection, row: 1, column: 0 }}
      state={model.state()}
      hasItems={model.list().length > 0}
      empty="No MCP servers"
      loading="Loading MCP servers…"
      onRetry={() => void props.controller.retry(model.target())}
    >
      <box>
        <McpBulkControls
          api={props.api}
          interaction={props.interaction}
          controller={props.controller}
          navigationSection={props.navigationSection}
          model={model}
        />
        <SectionFilter
          api={props.api}
          interaction={props.interaction}
          id={`${PLUGIN_ID}.filter.mcp`}
          position={{ section: props.navigationSection, row: 4, column: 0 }}
          query={props.query}
          placeholder="Filter MCP..."
          onInput={props.onQuery}
        />
        <Show
          when={model.filtered().length > 0}
          fallback={<text fg={props.api.theme.current.textMuted}>No matching MCP servers</text>}
        >
          <SidebarRowList density={props.preferences.rowDensity?.() ?? 'compact'}>
            <For each={model.visibility.visible()}>
              {(item, index) => (
                <>
                  <Show
                    when={
                      model.grouped() &&
                      (index() === 0 || model.visibility.visible()[index() - 1]?.bucket !== item.bucket)
                    }
                  >
                    <McpGroupHeader
                      api={props.api}
                      interaction={props.interaction}
                      bucket={item.bucket}
                      count={model.groupNames(item.bucket).length}
                      action={model.groupAction(item.bucket)}
                      disabled={model.bulkRunning() || model.mutationRunning()}
                      marginTop={index() > 0 ? 1 : 0}
                      position={{ section: props.navigationSection, row: 9 + index() * 3, column: 0 }}
                      onToggle={() =>
                        void props.controller.toggleGroup(item.bucket, model.groupNames(item.bucket), model.target())
                      }
                    />
                  </Show>
                  <McpRow
                    api={props.api}
                    interaction={props.interaction}
                    item={item}
                    position={{ section: props.navigationSection, row: 10 + index() * 3, column: 0 }}
                    state={props.controller.serverState(item.name, model.target())}
                    disabled={model.bulkRunning()}
                    onToggle={() => void props.controller.toggle(item.name).catch(() => {})}
                    onRetry={() => void props.controller.retryServer(item.name, model.target())?.catch(() => {})}
                    favorite={model.favorites().has(item.name)}
                    favoriteDisabled={props.preferences.ready?.() === false}
                    separator={
                      !model.grouped() &&
                      index() > 0 &&
                      model.favorites().has(model.visibility.visible()[index() - 1].name) &&
                      !model.favorites().has(item.name)
                    }
                    onToggleFavorite={() => props.preferences.toggleFavoriteMcpServer?.(item.name)}
                  />
                </>
              )}
            </For>
          </SidebarRowList>
          <ListVisibilityControl
            api={props.api}
            interaction={props.interaction}
            section="mcp"
            navigationSection={props.navigationSection}
            row={10 + model.visibility.visible().length * 3}
            visibility={model.visibility}
          />
        </Show>
      </box>
    </SectionRequestBody>
  )
}
