import { Show } from 'solid-js'

import { type SubagentViewItem, formatSubagentDuration } from '../../../entities/subagent'
import { PLUGIN_ID } from '../../../shared/config'
import { ListRow, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function SubagentRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  item: SubagentViewItem
  now: number
  position: SidebarPosition
  onOpen: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const retrying = () => props.item.status.type === 'retry'
  const idle = () => props.item.status.type === 'idle'
  const failed = () => props.item.run?.outcome === 'error'
  const cancelled = () => props.item.run?.outcome === 'cancelled'
  const id = () => `${PLUGIN_ID}.subagent.${props.item.session.id}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    position: () => props.position,
    activate: props.onOpen,
  })
  const leadingColor = () =>
    row.focused()
      ? row.foregroundColor()
      : failed()
        ? theme().error
        : retrying() || props.item.unavailable
          ? theme().warning
          : idle()
            ? theme().textMuted
            : theme().primary

  return (
    <ListRow
      ref={(node: BoxRenderable) => row.ref(node)}
      id={id()}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={row.backgroundColor()}
      onMouseOver={row.onMouseOver}
      onMouseOut={row.onMouseOut}
      onMouseDown={(event) => row.activate(event)}
      leading={
        <text flexShrink={0} fg={leadingColor()}>
          {icons.icon(failed() ? 'error' : cancelled() ? 'close' : retrying() ? 'retry' : idle() ? 'idle' : 'busy')}
        </text>
      }
      content={
        <text flexGrow={1} fg={row.foregroundColor()} wrapMode="word">
          {props.item.session.title}
        </text>
      }
      metadata={
        <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : theme().textMuted}>
          {props.item.run
            ? `${props.item.run.startedBeforeObservation ? `${icons.icon('recent')} ` : ''}${formatSubagentDuration(
                props.item.run.startedAt,
                props.item.run.finishedAt ?? props.now,
              )}`
            : ''}
        </text>
      }
      details={
        <>
          <Show when={props.item.run?.errorMessage}>
            <text
              fg={row.focused() ? row.foregroundColor() : failed() ? theme().error : theme().textMuted}
              wrapMode="word"
            >
              {cancelled() ? 'Cancelled' : 'Error'}: {props.item.run?.errorMessage}
            </text>
          </Show>
          <Show when={props.item.unavailable}>
            <text fg={theme().warning}>Worker status unavailable</text>
          </Show>
          <Show when={props.item.status.type === 'retry' ? props.item.status : undefined}>
            {(status) => (
              <text fg={row.focused() ? row.foregroundColor() : theme().warning} wrapMode="word">
                Retry #{status().attempt} · {Math.max(0, Math.ceil((status().next - props.now) / 1000))}s ·{' '}
                {status().message}
              </text>
            )}
          </Show>
          <Show when={idle() && !props.item.run?.errorMessage}>
            <text fg={theme().textMuted}>Finished</text>
          </Show>
        </>
      }
    />
  )
}
