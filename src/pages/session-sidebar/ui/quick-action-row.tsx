import { Show, createMemo, createSignal } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { ListRow, useIcons } from '../../../shared/ui'

import { createSidebarBookmark } from './sidebar-bookmark'
import { useSidebarItem } from './sidebar-item'
import { useSidebarList } from './sidebar-row-list'

import type { QUICK_ACTIONS } from '../../../entities/quick-action'
import type { SidebarPosition } from '../model/sidebar-interaction'
import type { BoxRenderable } from '@opentui/core'

export function QuickActionRow(props: {
  onNewSession?: () => boolean
  action: (typeof QUICK_ACTIONS)[number]
  disabled?: string
  favorite: boolean
  favoriteDisabled: boolean
  separator: boolean
  onToggleFavorite: () => void
  position: SidebarPosition
}) {
  const { api, interaction } = useSidebarList()
  const icons = useIcons()
  const theme = () => api.theme.current
  const [width, setWidth] = createSignal(0)
  const shortcut = createMemo(() => {
    const bindings = api.keymap.getCommandBindings({
      visibility: 'registered',
      commands: [props.action.command],
    })

    return api.keys.formatBindings(bindings.get(props.action.command))
  })
  const visibleShortcut = createMemo(() => {
    const value = shortcut()

    // Row padding, the leading bookmark and icon, and their gap consume eight cells.
    return value && width() >= Bun.stringWidth(props.action.label) + Bun.stringWidth(value) + 8 ? value : undefined
  })

  function run() {
    if (props.action.command === 'session.new' && props.onNewSession?.()) return

    const result = interaction
      ? interaction.dispatchFromReturnTarget(props.action.command)
      : api.keymap.dispatchCommand(props.action.command)

    if (result.ok) return

    api.ui.toast({
      variant: 'warning',
      title: props.action.label,
      message: `Command is ${result.reason}`,
      duration: 3000,
    })
  }
  const id = () => `${PLUGIN_ID}.quick-action.${props.action.command}`
  const row = useSidebarItem(api, interaction, {
    id: id(),
    position: () => ({ ...props.position, column: 1 }),
    activate: run,
    disabled: () => Boolean(props.disabled),
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

  return (
    <ListRow
      ref={(node: BoxRenderable) => row.ref(node)}
      id={id()}
      paddingLeft={1}
      paddingRight={1}
      marginTop={props.separator ? 1 : 0}
      onSizeChange={function (this: BoxRenderable) {
        setWidth(this.width)
      }}
      backgroundColor={row.backgroundColor()}
      onMouseOver={bookmark.onRowOver}
      onMouseOut={bookmark.onRowOut}
      onMouseUp={(event) => {
        event.stopPropagation()
        row.activate(event)
      }}
      leading={
        <>
          {bookmark.render()}
          <text
            flexShrink={0}
            fg={props.disabled ? theme().textMuted : row.focused() ? row.foregroundColor() : theme().accent}
          >
            {icons.action(props.action.command)}
          </text>
        </>
      }
      content={
        <text flexGrow={1} fg={row.foregroundColor()} wrapMode="none" truncate>
          {props.action.label}
        </text>
      }
      metadata={
        <Show when={visibleShortcut()}>
          {(value) => (
            <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : theme().textMuted} wrapMode="none">
              {value()}
            </text>
          )}
        </Show>
      }
      details={
        <Show when={props.disabled}>
          {(reason) => (
            <text fg={row.focused() ? row.foregroundColor() : theme().textMuted} wrapMode="word">
              {reason()}
            </text>
          )}
        </Show>
      }
    />
  )
}
