import { For, Show } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { useIcons } from '../../../shared/ui'

import { ListVisibilityControl } from './list-visibility'
import { McpBulkAction } from './mcp-bulk-action'
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
  const icons = useIcons()
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
        <box flexDirection="row" gap={1} paddingBottom={model.bulkRunning() || model.bulk().status === 'error' ? 1 : 0}>
          <McpBulkAction
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.mcp.connect-all`}
            position={{ section: props.navigationSection, row: 2, column: 0 }}
            label={`${icons.icon('connected')} Connect all`}
            disabled={model.bulkRunning() || model.mutationRunning() || model.connectable() === 0}
            onActivate={() => void props.controller.connectAll(model.target())}
          />
          <McpBulkAction
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.mcp.disconnect-all`}
            position={{ section: props.navigationSection, row: 2, column: 1 }}
            label={`${icons.icon('disconnected')} Disconnect all`}
            disabled={model.bulkRunning() || model.mutationRunning() || model.disconnectable() === 0}
            onActivate={() => void props.controller.disconnectAll(model.target())}
          />
        </box>
        <Show when={model.bulkRunning()}>
          <text fg={props.api.theme.current.textMuted}>
            {model.bulk().action === 'connect'
              ? 'Connecting'
              : model.bulk().action === 'disconnect'
                ? 'Disconnecting'
                : `Applying ${model.bulk().preset}`}{' '}
            {model.bulk().completed}/{model.bulk().total}…
          </text>
        </Show>
        <Show when={model.bulk().status === 'error'}>
          <McpBulkAction
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.mcp.retry-all`}
            position={{ section: props.navigationSection, row: 3, column: 0 }}
            label={`${icons.icon('retry')} Retry ${model.bulk().failed.length} failed`}
            disabled={false}
            onActivate={() => void props.controller.retryBulk(model.target())}
          />
        </Show>
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
                    <text
                      height={1}
                      marginTop={index() > 0 ? 1 : 0}
                      fg={props.api.theme.current.textMuted}
                      wrapMode="none"
                      truncate
                    >
                      {item.bucket}
                    </text>
                  </Show>
                  <McpRow
                    api={props.api}
                    interaction={props.interaction}
                    item={item}
                    position={{ section: props.navigationSection, row: 10 + index() * 2, column: 0 }}
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
            row={10 + model.visibility.visible().length * 2}
            visibility={model.visibility}
          />
        </Show>
      </box>
    </SectionRequestBody>
  )
}
