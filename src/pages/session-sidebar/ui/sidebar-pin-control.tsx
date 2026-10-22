import { IconControl, terminalIcon, useIcons } from '../../../shared/ui'
import { useToolbar } from '../model/toolbar-context'

import { useSidebarItem } from './sidebar-item'
import { useSidebarList } from './sidebar-row-list'

import type { ToolbarPin } from '../../../entities/preferences'
import type { SidebarPosition } from '../model/sidebar-interaction'

export function SidebarPinControl(props: { pin: ToolbarPin; position: SidebarPosition; id: string }) {
  const toolbar = useToolbar()
  const { api, interaction } = useSidebarList()
  const icons = useIcons()
  const item = useSidebarItem(
    api,
    interaction,
    {
      id: `${props.id}.pin`,
      position: () => ({ ...props.position, column: 2 }),
      activate: () => toolbar?.configure(props.pin),
    },
    () => (toolbar?.pinned(props.pin) ? api.theme.current.accent : api.theme.current.textMuted),
    'control',
  )

  return (
    <IconControl
      id={`${props.id}.pin`}
      ref={item.ref}
      icon={terminalIcon('pin', icons.style())}
      backgroundColor={item.backgroundColor()}
      foregroundColor={item.foregroundColor()}
      onMouseOver={item.onMouseOver}
      onMouseOut={item.onMouseOut}
      onMouseUp={(event) => item.activate(event)}
    />
  )
}
