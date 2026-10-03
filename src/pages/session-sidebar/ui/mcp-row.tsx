import { McpErrorDialog } from '../../../entities/mcp'
import { PLUGIN_ID } from '../../../shared/config'
import { IconControl, ListRow, useDialogs, useIcons } from '../../../shared/ui'
import { mcpColor, mcpToggle } from '../model/mcp-status'

import { RequestErrorRow } from './request-body'
import { createSidebarBookmark } from './sidebar-bookmark'
import { useSidebarItem } from './sidebar-item'
import { useSidebarList } from './sidebar-row-list'

import type { TargetRequestState } from '../../../shared/lib/request-state'
import type { SidebarPosition } from '../model/sidebar-interaction'
import type { TuiSidebarMcpItem } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function McpRow(props: {
  item: TuiSidebarMcpItem
  position: SidebarPosition
  state: TargetRequestState
  disabled: boolean
  onToggle: () => void
  onRetry: () => void
  favorite: boolean
  favoriteDisabled: boolean
  separator: boolean
  onToggleFavorite: () => void
}) {
  const { api, interaction, grouped } = useSidebarList()
  const icons = useIcons()
  const dialogs = useDialogs(api)
  const theme = () => api.theme.current
  const busy = () => props.state.status === 'loading' || props.state.status === 'refreshing'
  const error = () => props.state.error
  const disabled = () => props.disabled || busy()
  const id = () => `${PLUGIN_ID}.mcp.${props.item.name}`
  const row = useSidebarItem(api, interaction, {
    id: id(),
    position: () => ({ ...props.position, column: 1 }),
    disabled,
    activate: props.onToggle,
  })
  const bookmark = createSidebarBookmark({
    api,
    interaction,
    id: id(),
    position: () => props.position,
    row,
    favorite: () => props.favorite,
    disabled: () => props.favoriteDisabled,
    onToggle: props.onToggleFavorite,
  })
  const info = useSidebarItem(
    api,
    interaction,
    {
      id: `${id()}.info`,
      position: () => ({ ...props.position, column: 2 }),
      activate: () => {
        if (!props.item.error) return

        dialogs.open(
          () => (
            <McpErrorDialog api={api} name={props.item.name} status={props.item.status} error={props.item.error!} />
          ),
          'medium',
        )
      },
    },
    () => theme().error,
    'control',
  )
  const nestedBackground = (background: ReturnType<typeof row.backgroundColor>) =>
    background === 'transparent' ? row.backgroundColor() : background

  return (
    <ListRow
      ref={(node: BoxRenderable) => row.ref(node)}
      id={id()}
      backgroundColor={row.backgroundColor()}
      paddingLeft={grouped() ? 0 : 1}
      paddingRight={1}
      contentGap={0}
      paddingTop={error() ? 1 : 0}
      paddingBottom={error() ? 1 : 0}
      marginTop={props.separator ? 1 : 0}
      onMouseOver={bookmark.onRowOver}
      onMouseOut={bookmark.onRowOut}
      onMouseDown={(event) => row.activate(event)}
      leading={bookmark.render()}
      content={
        <text
          flexGrow={1}
          fg={
            row.focused() || disabled()
              ? row.foregroundColor()
              : props.item.status === 'connected'
                ? theme().text
                : theme().textMuted
          }
          wrapMode="none"
        >
          {props.item.name}
        </text>
      }
      trailing={
        <box flexDirection="row" flexShrink={0} gap={1}>
          {props.item.error ? (
            <IconControl
              ref={(node) => info.ref(node)}
              id={`${id()}.info`}
              icon={icons.icon('info')}
              backgroundColor={nestedBackground(info.backgroundColor())}
              foregroundColor={info.foregroundColor()}
              onMouseOver={info.onMouseOver}
              onMouseOut={info.onMouseOut}
              onMouseUp={(event) => info.activate(event)}
            />
          ) : null}
          <text fg={row.focused() ? row.foregroundColor() : mcpColor(api, props.item.status)}>
            <b>{icons.icon(mcpToggle(props.item.status, busy()))}</b>
          </text>
        </box>
      }
      details={
        <RequestErrorRow
          api={api}
          interaction={interaction}
          id={`${id()}.retry`}
          position={{ ...props.position, row: props.position.row + 1, column: 0 }}
          state={props.state}
          onRetry={props.onRetry}
        />
      }
    />
  )
}
