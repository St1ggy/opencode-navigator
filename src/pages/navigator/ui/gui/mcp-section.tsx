import { For, Show } from 'solid-js'

import { matchingMcpPreset } from '../../../../entities/mcp/model'
import { GuiIconAction } from '../../../../shared/ui/gui'

import { useNavigatorGui } from './context'
import { GuiMcpGroup } from './mcp-group'
import { MonitoringSection } from './section'
import { SectionFilter } from './section-filter'

export function McpSection() {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const view = () => catalogs().views.mcp
  const state = () => catalogs().mcp.state()
  const bulk = () => catalogs().mcp.bulkState()
  const matched = () => matchingMcpPreset(catalogs().mcp.list(), catalogs().preferences.mcpPresets())
  const Button = services.ui.Button

  return (
    <MonitoringSection
      id="mcp"
      title="MCP"
      count={view().all().length}
      actions={
        <Show when={services.onMcpPresets}>
          <Button size="small" variant="ghost" onClick={services.onMcpPresets}>
            {matched() || 'Preset'}
          </Button>
        </Show>
      }
    >
      <SectionFilter
        label="Filter MCP"
        placeholder="Filter servers and groups"
        value={view().query()}
        change={view().setQuery}
      />
      <Show when={state().error}>
        <p role="alert">{state().error?.message}</p>
        <GuiIconAction
          ui={services.ui}
          icon="refresh"
          label="Retry"
          onClick={() =>
            void catalogs()
              .mcp.retry()
              .catch(() => {})
          }
        />
      </Show>
      <Show when={bulk().status === 'running' || bulk().status === 'error'}>
        <p role="status">
          {bulk().completed}/{bulk().total} servers updated
        </p>
        <Show when={bulk().status === 'error'}>
          <Button
            size="small"
            onClick={() =>
              void catalogs()
                .mcp.retryBulk()
                ?.catch(() => {})
            }
          >
            Retry failed servers
          </Button>
        </Show>
      </Show>
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <For each={view().groups()} fallback={<p style={{ opacity: 0.65 }}>No matching MCP servers.</p>}>
          {(group) => <GuiMcpGroup group={group} />}
        </For>
      </div>
      <Show when={view().visibility.canToggle()}>
        <Button
          size="small"
          variant="ghost"
          onClick={() => (view().visibility.expanded() ? view().visibility.showLess() : view().visibility.showAll())}
        >
          {view().visibility.expanded() ? 'Show less' : `Show ${view().visibility.hiddenCount()} more`}
        </Button>
      </Show>
    </MonitoringSection>
  )
}
