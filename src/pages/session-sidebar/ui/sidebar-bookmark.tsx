import { createSignal } from 'solid-js'

import { BookmarkControl } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createSidebarBookmark(input: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  position: () => SidebarPosition
  row: ReturnType<typeof useSidebarItem>
  favorite: () => boolean
  disabled: () => boolean
  onToggle: () => void
}) {
  const { api, interaction, row, position, favorite, disabled, onToggle } = input
  const id = `${input.id}.favorite`
  const [rowHovered, setRowHovered] = createSignal(false)
  const [controlHovered, setControlHovered] = createSignal(false)
  const control = useSidebarItem(
    api,
    interaction,
    {
      id,
      position: () => ({ ...position(), column: 0 }),
      disabled,
      activate: () => {
        onToggle()
        queueMicrotask(() => interaction?.select(id))
      },
    },
    () => api.theme.current.warning,
    'control',
  )
  const visible = () => favorite() || row.focused() || control.focused() || rowHovered() || controlHovered()

  return {
    onRowOver: () => {
      row.onMouseOver()
      setRowHovered(true)
    },
    onRowOut: () => {
      row.onMouseOut()
      setRowHovered(false)
    },
    render: () => (
      <BookmarkControl
        ref={(node) => control.ref(node)}
        id={id}
        bookmarked={favorite()}
        visible={visible}
        backgroundColor={
          control.backgroundColor() === 'transparent' ? row.backgroundColor() : control.backgroundColor()
        }
        foregroundColor={row.focused() ? row.foregroundColor() : control.foregroundColor()}
        onMouseOver={() => {
          control.onMouseOver()
          setControlHovered(true)
        }}
        onMouseOut={() => {
          control.onMouseOut()
          setControlHovered(false)
        }}
        onMouseUp={(event) => control.activate(event)}
      />
    ),
  }
}
