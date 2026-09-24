import { For, Show } from 'solid-js'

import { SidebarRowList } from './sidebar-row-list'
import { SubagentRow } from './subagent-row'

import type { SubagentController, buildSubagentView } from '../../../entities/subagent'
import type { SidebarRowDensity } from '../../../shared/config'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type GroupedSubagentViewItem = ReturnType<typeof buildSubagentView>[number]

export function SubagentList(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: SubagentController
  navigationSection: number
  ids: string[]
  visible: readonly GroupedSubagentViewItem[]
  itemById: (id: string) => GroupedSubagentViewItem
  now: number
  density: SidebarRowDensity
}) {
  return (
    <SidebarRowList density={props.density}>
      <For each={props.ids}>
        {(id, index) => {
          const initial = props.itemById(id)
          const item = () => props.itemById(id) ?? initial
          const startsGroup = () => index() === 0 || props.visible[index() - 1]?.group !== item().group

          return (
            <box marginTop={index() > 0 && startsGroup() ? 1 : 0}>
              <Show when={startsGroup()}>
                <text fg={props.api.theme.current.textMuted}>
                  <b>{item().group}</b>
                </text>
              </Show>
              <SubagentRow
                api={props.api}
                interaction={props.interaction}
                item={item()}
                now={props.now}
                position={{ section: props.navigationSection, row: 10 + index(), column: 0 }}
                onOpen={() => props.controller.open(id)}
              />
            </box>
          )
        }}
      </For>
    </SidebarRowList>
  )
}
