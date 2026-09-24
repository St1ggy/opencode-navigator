import { Show, createComputed, untrack } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { SelectionBox, useIcons } from '../../../shared/ui'

import { useSidebarItem } from './sidebar-item'

import type { SidebarSection } from '../../../entities/sidebar-layout'
import type { ListVisibility } from '../../../shared/lib/list-visibility'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ListVisibilityControl(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  section: SidebarSection
  navigationSection: number
  row: number
  visibility: ListVisibility
}) {
  const icons = useIcons()
  const id = `${PLUGIN_ID}.list.${props.section}`

  createComputed(() => {
    const isVisible = props.visibility.canToggle()

    untrack(() => {
      if (!isVisible && props.interaction?.selectedId() === id) {
        props.interaction.select(`${PLUGIN_ID}.section.${props.section}`)
      }
    })
  })
  const item = useSidebarItem(props.api, props.interaction, {
    id,
    position: () => ({ section: props.navigationSection, row: props.row, column: 0 }),
    activate: () => {
      if (props.visibility.expanded()) props.visibility.showLess()
      else props.visibility.showAll()

      queueMicrotask(() => props.interaction?.select(id))
    },
  })

  return (
    <Show when={props.visibility.canToggle()}>
      <SelectionBox
        ref={item.ref}
        id={id}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={item.backgroundColor()}
        onMouseOver={item.onMouseOver}
        onMouseOut={item.onMouseOut}
        onMouseUp={(event) => {
          event.stopPropagation()
          item.activate(event)
        }}
      >
        <text fg={item.foregroundColor()}>
          {icons.icon(props.visibility.expanded() ? 'up' : 'down')}{' '}
          {props.visibility.expanded() ? 'Show less' : `Show all (${props.visibility.hiddenCount()} more)`}
        </text>
      </SelectionBox>
    </Show>
  )
}
