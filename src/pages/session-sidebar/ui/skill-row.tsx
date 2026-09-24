import { PLUGIN_ID } from '../../../shared/config'
import { BookmarkControl, ListRow, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SkillInfo } from '../../../entities/skill'
import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function SkillRow(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  item: SkillInfo
  position: SidebarPosition
  onUse: () => void
  favorite: boolean
  favoriteDisabled: boolean
  separator: boolean
  recent: boolean
  onToggleFavorite: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current
  const id = () => `${PLUGIN_ID}.skill.${props.item.location || props.item.name}`
  const row = useSidebarItem(props.api, props.interaction, {
    id: id(),
    position: () => ({ ...props.position, column: 0 }),
    activate: props.onUse,
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
      backgroundColor={row.backgroundColor()}
      onMouseOver={row.onMouseOver}
      onMouseOut={row.onMouseOut}
      onMouseUp={(event) => row.activate(event)}
      leading={
        <text flexShrink={0} fg={row.focused() ? row.foregroundColor() : theme().accent}>
          {icons.icon(props.recent ? 'recent' : 'skills')}
        </text>
      }
      content={
        <text flexGrow={1} fg={row.foregroundColor()} wrapMode="word">
          {props.item.name}
        </text>
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
