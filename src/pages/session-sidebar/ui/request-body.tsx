import { Show } from 'solid-js'

import { SelectionBox, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { TargetRequestState } from '../../../shared/lib/request-state'
import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'
import type { JSX } from 'solid-js'

export function RequestErrorRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  position: SidebarPosition
  state: TargetRequestState
  onRetry: () => void
}) {
  const icons = useIcons()
  const item = useSidebarItem(props.api, props.interaction, {
    id: props.id,
    position: () => props.position,
    disabled: () =>
      !props.state.error?.retryable || props.state.status === 'loading' || props.state.status === 'refreshing',
    activate: props.onRetry,
  })

  return (
    <Show when={props.state.error}>
      {(error) => (
        <SelectionBox
          ref={(node: BoxRenderable) => item.ref(node)}
          id={props.id}
          flexDirection="row"
          gap={1}
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={item.backgroundColor()}
          onMouseOver={item.onMouseOver}
          onMouseOut={item.onMouseOut}
          onMouseDown={(event) => {
            event.stopPropagation()
            item.activate(event)
          }}
        >
          <text
            flexGrow={1}
            fg={item.focused() ? item.foregroundColor() : props.api.theme.current.error}
            wrapMode="word"
          >
            {icons.icon('error')} {error().message}
          </text>
          <Show when={error().retryable}>
            <text flexShrink={0} fg={item.focused() ? item.foregroundColor() : props.api.theme.current.accent}>
              {icons.icon('retry')} Retry
            </text>
          </Show>
        </SelectionBox>
      )}
    </Show>
  )
}

export function SectionRequestBody(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  position: SidebarPosition
  state: TargetRequestState
  hasItems: boolean
  empty: string
  loading: string
  onRetry: () => void
  children: JSX.Element
}) {
  const icons = useIcons()
  const pending = () => props.state.status === 'loading'

  return (
    <box>
      <RequestErrorRow {...props} />
      <Show when={pending() && !props.hasItems}>
        <text fg={props.api.theme.current.textMuted}>
          {icons.icon('pending')} {props.loading}
        </text>
      </Show>
      <Show when={props.hasItems}>{props.children}</Show>
      <Show
        when={
          (props.state.status === 'ready' || props.state.status === 'refreshing') &&
          !props.hasItems &&
          !props.state.error
        }
      >
        <text fg={props.api.theme.current.textMuted}>
          {icons.icon('info')} {props.empty}
        </text>
      </Show>
    </box>
  )
}
