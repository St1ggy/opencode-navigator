import { For, Show, createMemo } from 'solid-js'

import {
  buildSubagentView,
  countSubagentView,
  createSubagentClock,
  filterSubagentView,
} from '../../../../entities/subagent/model'
import { GuiTabs } from '../../../../shared/ui/gui'

import { useNavigatorGui } from './context'
import { MonitoringSection } from './section'
import { SectionFilter } from './section-filter'
import { SubagentRow } from './subagent-row'

export function SubagentSection() {
  const props = useNavigatorGui()
  const mode = () => props.runtime.view.subagentMode()
  const query = () => props.runtime.view.subagentQuery()
  const id = () => props.runtime.target.sessionID
  const all = createMemo(() =>
    buildSubagentView(props.runtime.subagents.list(id()), props.runtime.subagents.recent(id())),
  )
  const counts = createMemo(() => countSubagentView(all(), query()))
  const selectedMode = () => (mode() === 'errors' && counts().errors === 0 ? 'recent' : mode())
  const rows = createMemo(() => filterSubagentView(all(), selectedMode(), query()))
  const state = () => props.runtime.subagents.state(id())
  const now = createSubagentClock(() =>
    all().some((item) => !item.run?.finishedAt) ? props.runtime.target.sessionKey : undefined,
  )
  const key = (item: ReturnType<typeof rows>[number]) => `${item.session.id}:${item.run?.startedAt ?? 0}:${item.group}`
  const keys = createMemo(() => rows().map((row) => key(row)))

  return (
    <MonitoringSection id="subagents" title="Subagents" count={all().length}>
      <SectionFilter
        label="Filter Subagents"
        placeholder="Filter subagents"
        value={query()}
        change={props.runtime.view.setSubagentQuery}
      />
      <GuiTabs
        ui={props.ui}
        label="Subagent filters"
        selected={selectedMode()}
        onSelect={props.runtime.view.setSubagentMode}
        options={(['active', 'recent', 'errors'] as const)
          .filter((value) => value !== 'errors' || counts().errors > 0)
          .map((value) => ({
            id: value,
            label: { active: 'Active', recent: 'Recent', errors: 'Errors' }[value],
            count: counts()[value],
            disabled: counts()[value] === 0,
          }))}
      />
      <Show when={state().error}>
        <p role="alert">{state().error?.message}</p>
      </Show>
      <Show when={rows().length > 0} fallback={<p style={{ opacity: 0.65 }}>No matching subagents.</p>}>
        <ul style={{ padding: '0', margin: '8px 0 0', 'list-style': 'none' }}>
          <For each={keys()}>
            {(rowKey) => (
              <Show when={rows().find((item) => key(item) === rowKey)}>
                {(item) => (
                  <SubagentRow
                    ui={props.ui}
                    item={item()}
                    now={now()}
                    open={() => props.runtime.subagents.open(item().session.id)}
                  />
                )}
              </Show>
            )}
          </For>
        </ul>
      </Show>
    </MonitoringSection>
  )
}
