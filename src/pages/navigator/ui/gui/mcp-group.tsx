import { For, Show } from 'solid-js'

import { mcpGroupStatus, mcpGroupToggleAction } from '../../../../entities/mcp/model'

import { useNavigatorGui } from './context'
import { GuiMcpRow } from './mcp-row'

export function GuiMcpGroup(props: { group: string }) {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const view = () => catalogs().views.mcp
  const bucket = () => view().bucket(props.group)
  const busy = () => catalogs().mcp.bulkState().group === props.group && catalogs().mcp.bulkState().status === 'running'
  const Switch = services.ui.Switch
  const Loader = services.ui.Loader
  const Button = services.ui.Button
  const disabled = () => catalogs().mcp.mutating() || !mcpGroupToggleAction(bucket())
  const toggle = () =>
    void catalogs()
      .mcp.toggleGroup(
        props.group,
        bucket().map((item) => item.name),
      )
      ?.catch(() => {})

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', 'align-items': 'center', 'min-width': '0' }} aria-busy={busy()}>
        <Switch
          label={`${props.group} MCP group`}
          hideLabel
          checked={mcpGroupStatus(bucket()) === 'connected'}
          disabled={disabled()}
          onChange={toggle}
        />
        <Button size="small" variant="ghost" disabled={disabled()} onClick={toggle}>
          <strong style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
            {props.group}
          </strong>
          <span style={{ opacity: 0.6, 'font-weight': '400' }}>{bucket().length}</span>
        </Button>
        <Show when={busy()}>
          <span role="status" aria-label={`Updating ${props.group} MCP group`}>
            <Loader size="small" />
          </span>
        </Show>
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
