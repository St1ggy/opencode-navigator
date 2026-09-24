import { TextAttributes } from '@opentui/core'
import { Show } from 'solid-js'

import { useIcons } from '../../../shared/ui'

import type { SidebarTodo } from '../../../entities/todo'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function TodoRow(props: { api: TuiPluginApi; item: SidebarTodo }) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const done = () => props.item.status === 'completed'
  const active = () => props.item.status === 'in_progress'
  const cancelled = () => props.item.status === 'cancelled'
  const priorityLabel = () => {
    if (props.item.priority === 'high') return icons.icon('up')

    if (props.item.priority === 'medium') return icons.icon('priorityMedium')

    if (props.item.priority === 'low') return icons.icon('down')

    return icons.icon('help')
  }
  const priorityColor = () => {
    if (props.item.priority === 'high') return theme().error

    if (props.item.priority === 'medium') return theme().warning

    return theme().info
  }

  return (
    <box flexDirection="row" gap={1}>
      <text
        flexShrink={0}
        fg={active() ? theme().warning : done() ? theme().success : cancelled() ? theme().error : theme().textMuted}
      >
        {icons.icon(done() ? 'done' : active() ? 'busy' : cancelled() ? 'close' : 'idle')}
      </text>
      <text
        flexGrow={1}
        fg={active() ? theme().primary : theme().textMuted}
        attributes={done() ? TextAttributes.STRIKETHROUGH : active() ? TextAttributes.BOLD : undefined}
        wrapMode="word"
      >
        {props.item.content}
      </text>
      <Show when={props.item.priority === 'high' || props.item.priority === 'medium' || props.item.priority === 'low'}>
        <text width={2} flexShrink={0} fg={priorityColor()}>
          <b> {priorityLabel()}</b>
        </text>
      </Show>
    </box>
  )
}
