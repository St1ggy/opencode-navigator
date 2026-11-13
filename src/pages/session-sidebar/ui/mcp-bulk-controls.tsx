import { Show } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { useIcons } from '../../../shared/ui'

import { McpBulkAction } from './mcp-bulk-action'

import type { McpController } from '../../../entities/mcp'
import type { createMcpSectionModel } from '../model/mcp-section-model'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpBulkControls(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: McpController
  navigationSection: number
  model: ReturnType<typeof createMcpSectionModel>
}) {
  const icons = useIcons()
  const model = props.model

  return (
    <>
      <box flexDirection="row" gap={1} paddingBottom={model.bulk().status === 'error' ? 1 : 0}>
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
    </>
  )
}
