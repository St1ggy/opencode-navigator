import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createComputed, Show, untrack } from "solid-js"
import type { ListVisibility } from "../controllers/list-visibility"
import type { SidebarInteraction } from "../sidebar-interaction"
import type { SidebarSection } from "../state"
import { useSidebarItem } from "./common"

export function ListVisibilityControl(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  section: SidebarSection
  order: number
  visibility: ListVisibility
}) {
  const id = `opencode-pretty-sidebar.list.${props.section}`
  createComputed(() => {
    const visible = props.visibility.canToggle()
    untrack(() => {
      if (!visible && props.interaction?.selectedId() === id) {
        props.interaction.select(`opencode-pretty-sidebar.section.${props.section}`)
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
      <box
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
          {props.visibility.expanded() ? "Show less" : `Show all (${props.visibility.hiddenCount()} more)`}
        </text>
      </box>
    </Show>
  )
}
