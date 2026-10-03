import { PLUGIN_ID } from '../../../shared/config'
import { ListRow, useIcons } from '../../../shared/ui'

import { createSidebarBookmark } from './sidebar-bookmark'
import { useSidebarItem } from './sidebar-item'
import { useSidebarList } from './sidebar-row-list'

import type { SkillInfo } from '../../../entities/skill'
import type { SidebarPosition } from '../model/sidebar-interaction'
import type { BoxRenderable } from '@opentui/core'

export function SkillRow(props: {
  item: SkillInfo
  position: SidebarPosition
  onUse: () => void
  favorite: boolean
  favoriteDisabled: boolean
  separator: boolean
  recent: boolean
  onToggleFavorite: () => void
}) {
  const { api, interaction, grouped } = useSidebarList()
  const icons = useIcons()
  const id = () => `${PLUGIN_ID}.skill.${props.item.location || props.item.name}`
  const row = useSidebarItem(api, interaction, {
    id: id(),
    position: () => ({ ...props.position, column: 1 }),
    activate: props.onUse,
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
      paddingLeft={grouped() ? 0 : 1}
      paddingRight={1}
      contentGap={0}
      marginTop={props.separator ? 1 : 0}
      backgroundColor={row.backgroundColor()}
      onMouseOver={bookmark.onRowOver}
      onMouseOut={bookmark.onRowOut}
      onMouseUp={(event) => row.activate(event)}
      leading={bookmark.render()}
      content={
        <text flexGrow={1} fg={row.foregroundColor()} wrapMode="word">
          {props.recent ? `${icons.icon('recent')} ` : ''}
          {props.item.name}
        </text>
      }
    />
  )
}
