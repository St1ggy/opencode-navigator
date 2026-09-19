import { Show, createComputed, untrack } from 'solid-js'

import { PLUGIN_ID } from '../constants'
import { useIcons } from '../icons/context'

import { useSidebarItem } from './common'
import { SelectionBox } from './selection-box'

import type { ListVisibility } from '../controllers/list-visibility'
import type { SidebarInteraction } from '../sidebar-interaction'
import type { SidebarSection } from '../state'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ListVisibilityControl(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  section: SidebarSection
  order: number
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
    order: () => [props.order, 11 + props.visibility.visible().length * 2],
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
