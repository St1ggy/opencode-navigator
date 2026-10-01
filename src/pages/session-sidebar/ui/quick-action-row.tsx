import { Show, createMemo, createSignal } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { BookmarkControl, ListRow, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { QUICK_ACTIONS } from '../../../entities/quick-action'
import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function QuickActionRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  onNewSession?: () => boolean
  action: (typeof QUICK_ACTIONS)[number]
  disabled?: string
  favorite: boolean
  favoriteDisabled: boolean
  separator: boolean
  onToggleFavorite: () => void
  position: SidebarPosition
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const [width, setWidth] = createSignal(0)
  const shortcut = createMemo(() => {
    const bindings = props.api.keymap.getCommandBindings({
      visibility: 'registered',
      commands: [props.action.command],
    })

    return props.api.keys.formatBindings(bindings.get(props.action.command))
  })
  const visibleShortcut = createMemo(() => {
    const value = shortcut()

    // Row padding, icon, bookmark control, and three gaps consume nine cells.
    return value && width() >= Bun.stringWidth(props.action.label) + Bun.stringWidth(value) + 9 ? value : undefined
  })

  function run() {
    if (props.action.command === 'session.new' && props.onNewSession?.()) return

    const result = props.interaction
      ? props.interaction.dispatchFromReturnTarget(props.action.command)
      : props.api.keymap.dispatchCommand(props.action.command)

    if (result.ok) return

    props.api.ui.toast({
      variant: 'warning',
      title: props.action.label,
      message: `Command is ${result.reason}`,
      duration: 3000,
    })
  }
  const id = () => `${PLUGIN_ID}.quick-action.${props.action.command}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    position: () => props.position,
    activate: run,
    disabled: () => Boolean(props.disabled),
  })
  const favorite = useSidebarItem(
    props.api,
    props.interaction,
    {
      id: `${id()}.favorite`,
      position: () => ({ ...props.position, column: 1 }),
      disabled: () => props.favoriteDisabled,
      activate: () => {
        props.onToggleFavorite()
        queueMicrotask(() => props.interaction?.select(`${id()}.favorite`))
      },
    },
    () => theme().warning,
    'control',
  )
  const controlBackground = () => {
    const background = favorite.backgroundColor()

    return background === 'transparent' ? row.backgroundColor() : background
  }

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
      onMouseOver={row.onMouseOver}
      onMouseOut={row.onMouseOut}
      onMouseUp={(event) => {
        event.stopPropagation()
        row.activate(event)
      }}
      leading={
        <text
          flexShrink={0}
          fg={props.disabled ? theme().textMuted : row.focused() ? row.foregroundColor() : theme().accent}
        >
          {icons.action(props.action.command)}
        </text>
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
      trailing={
        <BookmarkControl
          ref={(node) => favorite.ref(node)}
          id={`${id()}.favorite`}
          bookmarked={props.favorite}
          backgroundColor={controlBackground()}
          foregroundColor={row.focused() ? row.foregroundColor() : favorite.foregroundColor()}
          onMouseOver={favorite.onMouseOver}
          onMouseOut={favorite.onMouseOut}
          onMouseUp={(event) => favorite.activate(event)}
        />
      }
    />
  )
}
