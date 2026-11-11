import { Show } from 'solid-js'

import { mcpToggleAction } from '../../../../entities/mcp/model'

import { CatalogRow } from './catalog-row'
import { useNavigatorGui } from './context'
import { McpIndicator } from './mcp-indicator'

import type { McpItem } from '../../../../entities/mcp/model'

export function GuiMcpRow(props: { item: McpItem }) {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const state = () => catalogs().mcp.serverState(props.item.name)
  const error = () => props.item.error || state().error?.message
  const Button = services.ui.Button

  return (
    <CatalogRow
      title={props.item.name}
      details={props.item.title}
      favorite={catalogs().preferences.favoriteMcpServers().has(props.item.name)}
      bookmarkDisabled={!catalogs().preferences.ready()}
      bookmark={() => catalogs().preferences.toggleFavoriteMcpServer(props.item.name)}
      leading={<McpIndicator status={state().status === 'loading' ? 'pending' : props.item.status} />}
      disabled={!mcpToggleAction(props.item.status) || state().status === 'loading'}
      activate={() =>
        void catalogs()
          .mcp.toggle(props.item.name)
          .catch(() => {})
      }
      trailing={
        <Show when={error()}>
          <Button
            size="small"
            variant="ghost"
            onClick={() => services.onMcpInformation({ ...props.item, error: error() })}
          >
            Info
          </Button>
        </Show>
      }
    />
  )
}
