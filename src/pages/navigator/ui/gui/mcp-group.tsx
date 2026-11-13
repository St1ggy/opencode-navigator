import { For, Show } from 'solid-js'

import { mcpGroupStatus, mcpGroupToggleAction } from '../../../../entities/mcp/model'
import { GuiPendingSwitch } from '../../../../shared/ui/gui'

import { useNavigatorGui } from './context'
import { GuiMcpRow } from './mcp-row'

export function GuiMcpGroup(props: { group: string }) {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const view = () => catalogs().views.mcp
  const bucket = () => view().bucket(props.group)
  const busy = () =>
    (catalogs().mcp.bulkState().group === props.group && catalogs().mcp.bulkState().status === 'running') ||
    bucket().some(
      (item) =>
        item.status === 'pending' || ['loading', 'refreshing'].includes(catalogs().mcp.serverState(item.name).status),
    )
  const Button = services.ui.Button
  const disabled = () => busy() || catalogs().mcp.mutating() || !mcpGroupToggleAction(bucket())
  const toggle = () =>
    void catalogs()
      .mcp.toggleGroup(
        props.group,
        bucket().map((item) => item.name),
      )
      ?.catch(() => {})

  return (
    <div>
      <div
        data-navigator-mcp-group
        style={{
          display: 'flex',
          'justify-content': 'space-between',
          gap: '6px',
          'align-items': 'center',
          'min-width': '0',
        }}
        aria-busy={busy()}
      >
        <span style={{ flex: '1', 'min-width': '0', overflow: 'hidden' }}>
          <Button size="small" variant="ghost" disabled={disabled()} onClick={toggle}>
            <strong style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
              {props.group}
            </strong>
            <span style={{ opacity: 0.6, 'font-weight': '400' }}>{bucket().length}</span>
          </Button>
        </span>
        <GuiPendingSwitch
          ui={services.ui}
          busy={busy()}
          label={`${props.group} MCP group`}
          checked={mcpGroupStatus(bucket()) === 'connected'}
          disabled={disabled()}
          onChange={toggle}
        />
      </div>
      <ul style={{ margin: '0', padding: '0 0 0 10px', 'list-style': 'none' }}>
        <For
          each={view()
            .visibility.visible()
            .filter((item) => item.bucket === props.group)
            .map((item) => item.name)}
        >
          {(name) => (
            <Show
              when={view()
                .visibility.visible()
                .find((item) => item.name === name)}
            >
              {(item) => <GuiMcpRow item={item()} />}
            </Show>
          )}
        </For>
      </ul>
    </div>
  )
}
