import { McpErrorDialog } from '../../../entities/mcp'
import { PLUGIN_ID } from '../../../shared/config'
import { BookmarkControl, IconControl, ListRow, useDialogs, useIcons } from '../../../shared/ui'
import { mcpColor, mcpToggle } from '../model/mcp-status'

import { RequestErrorRow } from './request-body'
import { useSidebarItem } from './sidebar-item'

import type { TargetRequestState } from '../../../shared/lib/request-state'
import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi, TuiSidebarMcpItem } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function McpRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
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
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const theme = () => props.api.theme.current
  const busy = () => props.state.status === 'loading' || props.state.status === 'refreshing'
  const error = () => props.state.error
  const disabled = () => props.disabled || busy()
  const id = () => `${PLUGIN_ID}.mcp.${props.item.name}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    position: () => ({ ...props.position, column: 0 }),
    disabled,
    activate: props.onToggle,
  })
  const bookmark = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: `${id()}.favorite`,
      position: () => ({ ...props.position, column: 2 }),
      disabled: () => props.favoriteDisabled,
      activate: () => {
        props.onToggleFavorite()
        queueMicrotask(() => props.interaction?.select(`${id()}.favorite`))
      },
    },
    () => theme().warning,
    'control',
  )
  const info = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: `${id()}.info`,
      position: () => ({ ...props.position, column: 1 }),
      activate: () => {
        if (!props.item.error) return

        dialogs.open(
          () => (
            <McpErrorDialog
              api={props.api}
              name={props.item.name}
              status={props.item.status}
              error={props.item.error!}
            />
          ),
          'medium',
        )
      },
    },
    () => theme().error,
    'control',
  )
  const nestedBackground = (background: ReturnType<typeof bookmark.backgroundColor>) =>
    background === 'transparent' ? row.backgroundColor() : background

  return (
    <ListRow
      ref={(node: BoxRenderable) => row.ref(node)}
      id={id()}
      backgroundColor={row.backgroundColor()}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={error() ? 1 : 0}
      paddingBottom={error() ? 1 : 0}
      marginTop={props.separator ? 1 : 0}
      onMouseOver={row.onMouseOver}
      onMouseOut={row.onMouseOut}
      onMouseDown={(event) => row.activate(event)}
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
          <text fg={row.focused() ? row.foregroundColor() : mcpColor(props.api, props.item.status)}>
            <b>{icons.icon(mcpToggle(props.item.status, busy()))}</b>
          </text>
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
          <BookmarkControl
            ref={(node) => bookmark.ref(node)}
            id={`${id()}.favorite`}
            bookmarked={props.favorite}
            backgroundColor={nestedBackground(bookmark.backgroundColor())}
            foregroundColor={row.focused() ? row.foregroundColor() : bookmark.foregroundColor()}
            onMouseOver={bookmark.onMouseOver}
            onMouseOut={bookmark.onMouseOut}
            onMouseUp={(event) => bookmark.activate(event)}
          />
        </box>
      }
      details={
        <RequestErrorRow
          api={props.api}
          interaction={props.interaction}
          id={`${id()}.retry`}
          position={{ ...props.position, row: props.position.row + 1, column: 0 }}
          state={props.state}
          onRetry={props.onRetry}
        />
      }
    />
  )
}
