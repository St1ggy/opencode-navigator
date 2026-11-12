import { Show } from 'solid-js'

import { mcpToggleAction } from '../../../../entities/mcp/model'
import { GuiIconAction } from '../../../../shared/ui/gui'

import { CatalogRow } from './catalog-row'
import { useNavigatorGui } from './context'

import type { McpItem } from '../../../../entities/mcp/model'

export function GuiMcpRow(props: { item: McpItem }) {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const state = () => catalogs().mcp.serverState(props.item.name)
  const error = () => props.item.error || state().error?.message
  const Switch = services.ui.Switch
  const Loader = services.ui.Loader
  const busy = () => state().status === 'loading' || props.item.status === 'pending'

  return (
    <CatalogRow
      title={props.item.name}
      details={props.item.title}
      favorite={catalogs().preferences.favoriteMcpServers().has(props.item.name)}
      bookmarkDisabled={!catalogs().preferences.ready()}
      bookmark={() => catalogs().preferences.toggleFavoriteMcpServer(props.item.name)}
      content={
        <div style={{ flex: '1', 'min-width': '0', 'overflow-wrap': 'anywhere' }} aria-busy={busy()}>
          <Switch
            label={props.item.name}
            description={props.item.title}
            checked={props.item.status === 'connected'}
            disabled={!mcpToggleAction(props.item.status) || catalogs().mcp.mutating() || busy()}
            onChange={() =>
              void catalogs()
                .mcp.toggle(props.item.name)
                .catch(() => {})
            }
          />
          <Show when={busy()}>
            <span role="status">
              <Loader size="small" /> Updating connection…
            </span>
          </Show>
        </div>
      }
      trailing={
        <Show when={error()}>
          <GuiIconAction
            ui={services.ui}
            icon="info"
            label={`Information about ${props.item.name}`}
            onClick={() => services.onMcpInformation({ ...props.item, error: error() })}
          />
        </Show>
      }
    />
  )
}
