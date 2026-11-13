import { Show } from 'solid-js'

import { mcpToggleAction } from '../../../../entities/mcp/model'
import { GuiIconAction, GuiPendingSwitch } from '../../../../shared/ui/gui'

import { CatalogRow } from './catalog-row'
import { useNavigatorGui } from './context'
import { GuiMcpRoutingAction } from './mcp-routing-action'

import type { McpItem } from '../../../../entities/mcp/model'

export function GuiMcpRow(props: { item: McpItem }) {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const state = () => catalogs().mcp.serverState(props.item.name)
  const error = () => props.item.error || state().error?.message
  const routing = () => services.runtime.codeMode?.routing(props.item.name)
  const busy = () => ['loading', 'refreshing'].includes(state().status) || props.item.status === 'pending'

  return (
    <CatalogRow
      title={props.item.name}
      details={props.item.title}
      favorite={catalogs().preferences.favoriteMcpServers().has(props.item.name)}
      bookmarkDisabled={!catalogs().preferences.ready()}
      bookmark={() => catalogs().preferences.toggleFavoriteMcpServer(props.item.name)}
      content={
        <div style={{ flex: '1', 'min-width': '0' }} aria-busy={busy()}>
          <div
            data-navigator-mcp-row
            style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              gap: '8px',
              'min-width': '0',
            }}
          >
            <div style={{ flex: '1', 'min-width': '0', 'overflow-wrap': 'anywhere', 'font-size': '12px' }}>
              <span style={{ color: 'var(--v2-text-text-base)' }}>{props.item.name}</span>
              <Show when={props.item.title && props.item.title !== props.item.name}>
                <span style={{ display: 'block', color: 'var(--v2-text-text-muted)', 'font-size': '11px' }}>
                  {props.item.title}
                </span>
              </Show>
            </div>
            <Show when={services.runtime.codeMode}>
              <GuiMcpRoutingAction
                ui={services.ui}
                server={props.item.name}
                mode={routing()?.mode}
                open={() => services.onCodeModeRouting?.(props.item.name)}
              />
            </Show>
            <span
              data-navigator-mcp-info-slot
              aria-hidden={!error() || undefined}
              style={{ display: 'flex', 'flex-shrink': '0', visibility: error() ? 'visible' : 'hidden' }}
            >
              <GuiIconAction
                ui={services.ui}
                icon="info"
                label={`Information about ${props.item.name}`}
                disabled={!error()}
                onClick={() => {
                  if (error()) services.onMcpInformation({ ...props.item, error: error() })
                }}
              />
            </span>
            <span style={{ display: 'flex', 'flex-shrink': '0', 'align-items': 'center' }}>
              <GuiPendingSwitch
                ui={services.ui}
                busy={busy()}
                label={props.item.name}
                checked={props.item.status === 'connected'}
                disabled={!mcpToggleAction(props.item.status) || catalogs().mcp.mutating() || busy()}
                onChange={() =>
                  void catalogs()
                    .mcp.toggle(props.item.name)
                    .catch(() => {})
                }
              />
            </span>
          </div>
        </div>
      }
    />
  )
}
