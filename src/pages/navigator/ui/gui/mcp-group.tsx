import { For, Show } from 'solid-js'

import { mcpGroupStatus } from '../../../../entities/mcp/model'

import { useNavigatorGui } from './context'
import { McpIndicator } from './mcp-indicator'
import { GuiMcpRow } from './mcp-row'

export function GuiMcpGroup(props: { group: string }) {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const view = () => catalogs().views.mcp
  const bucket = () => view().bucket(props.group)
  const busy = () => catalogs().mcp.bulkState().group === props.group && catalogs().mcp.bulkState().status === 'running'

  return (
    <div>
      <button
        type="button"
        disabled={catalogs().mcp.mutating()}
        onClick={() =>
          void catalogs()
            .mcp.toggleGroup(
              props.group,
              bucket().map((item) => item.name),
            )
            ?.catch(() => {})
        }
        style={{
          display: 'flex',
          gap: '6px',
          'align-items': 'center',
          width: '100%',
          padding: '4px 0',
          border: '0',
          background: 'transparent',
          color: 'inherit',
          'text-align': 'left',
        }}
      >
        <McpIndicator status={mcpGroupStatus(bucket(), busy())} />
        <strong style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
          {props.group}
        </strong>
        <span style={{ opacity: 0.6, 'font-weight': '400' }}>{bucket().length}</span>
      </button>
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
