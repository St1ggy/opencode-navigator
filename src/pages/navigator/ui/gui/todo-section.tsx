import { For, Index, Show, createMemo } from 'solid-js'

import { buildTodoView } from '../../../../entities/todo/model'
import { GuiTabs } from '../../../../shared/ui/gui'

import { useNavigatorGui } from './context'
import { MonitoringSection } from './section'
import { SectionFilter } from './section-filter'
import { TodoRow } from './todo-row'

export function TodoSection() {
  const props = useNavigatorGui()
  const mode = () => props.runtime.view.todoMode()
  const query = () => props.runtime.view.todoQuery()
  const id = () => props.runtime.target.sessionID
  const setup = () => props.runtime.todoSetup?.state(id())
  const enabled = () => setup()?.enabled === true
  const rows = createMemo(() =>
    props.runtime.todo.list(id()).filter((item) => item.content.toLowerCase().includes(query().toLowerCase())),
  )
  const view = createMemo(() => buildTodoView(rows(), mode()))
  const state = () => props.runtime.todo.state(id())
  const Button = props.ui.Button

  return (
    <MonitoringSection id="todo" title="Todo" count={enabled() ? rows().length : undefined}>
      <Show
        when={setup()?.status !== 'loading' || setup()?.enabled !== undefined}
        fallback={<p role="status">Reading Todo configuration…</p>}
      >
        <Show
          when={enabled()}
          fallback={
            <div>
              <p>{setup()?.status === 'error' ? setup()?.error : 'Native Todo is disabled for this session.'}</p>
              <Button size="small" onClick={props.onEnableTodo}>
                Enable Todo
              </Button>
              <Button size="small" variant="ghost" onClick={() => void props.runtime.refresh(true)}>
                Retry
              </Button>
            </div>
          }
        >
          <SectionFilter
            label="Filter Todo"
            placeholder="Filter tasks"
            value={query()}
            change={props.runtime.view.setTodoQuery}
          />
          <GuiTabs
            ui={props.ui}
            label="Todo filters"
            selected={mode()}
            onSelect={props.runtime.view.setTodoMode}
            options={[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'finished', label: 'Finished' },
            ]}
          />
          <Show when={state().error}>
            <p role="alert">{state().error?.message}</p>
          </Show>
          <Show when={setup()?.status === 'error'}>
            <p role="alert">{setup()?.error}</p>
          </Show>
          <Show
            when={view().rows.length > 0}
            fallback={<p style={{ opacity: 0.65 }}>No matching tasks. Manage Todo through chat.</p>}
          >
            <p style={{ opacity: 0.65, 'font-size': '12px' }}>
              {rows().filter((item) => item.status === 'completed').length} completed of {view().counts.all}
            </p>
            <For each={view().groups.map((group) => group.title)}>
              {(title) => (
                <div>
                  <h3 style={{ 'font-size': '12px', opacity: 0.65 }}>{title}</h3>
                  <ul style={{ padding: '0', margin: '0', 'list-style': 'none' }}>
                    <Index each={view().groups.find((group) => group.title === title)?.items ?? []}>
                      {(item) => <TodoRow item={item()} />}
                    </Index>
                  </ul>
                </div>
              )}
            </For>
          </Show>
        </Show>
      </Show>
      <Button size="small" variant="ghost-muted" onClick={props.onArchive}>
        Legacy archive
      </Button>
    </MonitoringSection>
  )
}
