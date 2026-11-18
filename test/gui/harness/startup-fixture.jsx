import { For, Show, createSignal, untrack } from 'solid-js'

import { createGuiSectionLayouts } from '../../../src/app/gui/section-layouts'
import { NavigatorGuiContext } from '../../../src/pages/navigator/ui/gui/context'
import { MonitoringSection } from '../../../src/pages/navigator/ui/gui/section'
import { SectionFilter } from '../../../src/pages/navigator/ui/gui/section-filter'
import { TodoRow } from '../../../src/pages/navigator/ui/gui/todo-row'
import { GuiTabs } from '../../../src/shared/ui/gui'

const ids = ['limits', 'todo', 'subagents', 'skills', 'quick_actions', 'mcp', 'code_mode']

export function StartupFixture(props) {
  const context = untrack(() => props.context)
  const [pending, setPending] = createSignal(false)
  const [failed, setFailed] = createSignal(false)
  const [expanded, setExpanded] = createSignal(Object.fromEntries(ids.map((id) => [id, id !== 'code_mode'])))
  const [recorded, setRecorded] = createSignal(new Set())
  const [extra, setExtra] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [mode, setMode] = createSignal('all')
  const cache = createGuiSectionLayouts(context)
  const Button = context.ui.Button
  const initiallyOpen = new Set(ids.filter((id) => id !== 'code_mode'))
  const services = {
    ui: context.ui,
    sectionLayouts: {
      read: cache.read,
      write(key, layout) {
        cache.write(key, layout)
        setRecorded((value) => new Set([...value, key]))
      },
    },
    runtime: {
      target: { sessionKey: 'synthetic-startup' },
      startup: { loading: (id) => pending() && initiallyOpen.has(id) },
      catalogs: {
        preferences: {
          expanded,
          toggleSectionExpanded: (id) => setExpanded((value) => ({ ...value, [id]: value[id] === false })),
        },
      },
    },
  }

  return (
    <NavigatorGuiContext.Provider value={services}>
      <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '8px' }}>
        <Button
          onClick={() => {
            setFailed(false)
            setPending(true)
          }}
        >
          Begin startup
        </Button>
        <Button onClick={() => setExtra(true)}>Receive synthetic data</Button>
        <Button onClick={() => setPending(false)}>Finish startup</Button>
        <Button
          onClick={() => {
            setFailed(true)
            setPending(false)
          }}
        >
          Fail startup
        </Button>
      </div>
      <div
        data-startup-fixture
        data-layouts-ready={recorded().size >= initiallyOpen.size}
        style={{ width: '420px', 'max-width': '100%', 'max-height': '45vh', 'overflow-y': 'auto' }}
      >
        <For each={ids}>
          {(id) => (
            <MonitoringSection id={id} title={id}>
              <SectionFilter
                label={`Filter synthetic ${id}`}
                placeholder="Synthetic filter"
                value={query()}
                change={setQuery}
              />
              <GuiTabs
                ui={context.ui}
                label={`Synthetic ${id} filters`}
                selected={mode()}
                options={[
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active' },
                ]}
                onSelect={setMode}
              />
              <ul style={{ margin: '0', padding: '0', 'list-style': 'none' }}>
                <TodoRow
                  item={{
                    content: 'Synthetic multiline task with a deliberately long description to wrap at narrow widths',
                    status: 'in_progress',
                  }}
                />
                <TodoRow item={{ content: 'Synthetic completed task', status: 'completed' }} />
                <Show when={extra()}>
                  <TodoRow item={{ content: 'New synthetic task received during startup', status: 'pending' }} />
                </Show>
              </ul>
              <Show when={failed()}>
                <p role="alert">Synthetic startup failure</p>
              </Show>
            </MonitoringSection>
          )}
        </For>
      </div>
    </NavigatorGuiContext.Provider>
  )
}
