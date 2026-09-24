import { Show, createSignal } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { SelectionBox, lspIcon, lspIconName, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { LspIconStyle } from '../../../shared/ui'
import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi, TuiSidebarLspItem } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function LspBadge(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  navigationId?: string
  position?: SidebarPosition
  status: TuiSidebarLspItem['status']
  iconStyle?: LspIconStyle
}) {
  const icons = useIcons()
  const isKnown = lspIconName(props.id) !== undefined
  const [showName, setShowName] = createSignal(false)
  const statusColor = () =>
    props.status === 'connected' ? props.api.theme.current.success : props.api.theme.current.error

  if (!isKnown) {
    // Legacy badges without an action stay noninteractive for their mounted lifetime.
    // eslint-disable-next-line solid/components-return-once
    return (
      <text flexShrink={1} fg={statusColor()} wrapMode="none">
        {props.id}
      </text>
    )
  }

  const item = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: props.navigationId ?? `${PLUGIN_ID}.lsp.${props.id}`,
      position: () => props.position ?? { section: 0, row: 0, column: 0 },
      activate: () => setShowName((value) => !value),
    },
    statusColor,
  )

  return (
    <SelectionBox
      iconOnly={isKnown && !showName()}
      ref={(node: BoxRenderable) => item.ref(node)}
      id={props.navigationId ?? `${PLUGIN_ID}.lsp.${props.id}`}
      flexDirection="row"
      gap={1}
      flexShrink={0}
      backgroundColor={item.backgroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseDown={(event) => {
        event.stopPropagation()
        item.activate(event)
      }}
    >
      <text flexShrink={0} fg={item.foregroundColor()}>
        {lspIcon(props.id, props.iconStyle ?? icons.style())}
      </text>
      <Show when={showName()}>
        <text
          flexShrink={0}
          fg={item.focused() ? item.foregroundColor() : props.api.theme.current.textMuted}
          wrapMode="none"
        >
          {props.id}
        </text>
      </Show>
    </SelectionBox>
  )
}
