import { For, Show } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'

import { ListVisibilityControl } from './list-visibility'
import { SectionTab } from './section-tab'
import { SidebarRowList } from './sidebar-row-list'
import { TodoRow } from './todo-row'

import type { TodoViewMode, buildTodoView } from '../../../entities/todo'
import type { SidebarRowDensity } from '../../../shared/config'
import type { createListVisibility } from '../../../shared/lib/list-visibility'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type TodoView = ReturnType<typeof buildTodoView>
type TodoVisibility = ReturnType<typeof createListVisibility<TodoView['rows'][number]>>

export function TodoContents(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  navigationSection?: number
  mode: TodoViewMode
  setMode: (mode: TodoViewMode) => void
  view: TodoView
  visibility: TodoVisibility
  density: SidebarRowDensity
}) {
  const navigationSection = () => props.navigationSection ?? 1

  return (
    <box gap={1}>
      <box flexDirection="row" flexWrap="wrap">
        <For each={['all', 'active', 'finished'] as const}>
          {(value, index) => (
            <SectionTab
              api={props.api}
              interaction={props.interaction}
              id={`${PLUGIN_ID}.todo.filter.${value}`}
              position={{ section: navigationSection(), row: 2, column: index() }}
              label={value[0].toUpperCase() + value.slice(1)}
              count={props.view.counts[value]}
              selected={props.mode === value}
              onActivate={() => props.setMode(value)}
            />
          )}
        </For>
      </box>
      <Show when={props.view.rows.length > 0} fallback={<EmptyTodo api={props.api} mode={props.mode} />}>
        <SidebarRowList density={props.density}>
          <For each={props.visibility.visible()}>
            {(row, index) => {
              const startsGroup = () => index() === 0 || props.visibility.visible()[index() - 1].group !== row.group

              return (
                <box marginTop={index() > 0 && startsGroup() ? 1 : 0}>
                  <Show when={startsGroup()}>
                    <text fg={props.api.theme.current.textMuted}>
                      <b>{row.group}</b>
                    </text>
                  </Show>
                  <TodoRow api={props.api} item={row.item} />
                </box>
              )
            }}
          </For>
        </SidebarRowList>
      </Show>
      <ListVisibilityControl
        api={props.api}
        interaction={props.interaction}
        section="todo"
        navigationSection={navigationSection()}
        row={3}
        visibility={props.visibility}
      />
    </box>
  )
}

function EmptyTodo(props: { api: TuiPluginApi; mode: TodoViewMode }) {
  return (
    <text fg={props.api.theme.current.textMuted}>
      {props.mode === 'active' ? 'No active tasks' : 'No finished tasks'}
    </text>
  )
}
