import { For, Show } from 'solid-js'

import { GuiActionRow } from './action-row'
import { useNavigatorGui } from './context'
import { MonitoringSection } from './section'
import { SectionFilter } from './section-filter'

export function ActionsSection() {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const view = () => catalogs().views.actions
  const Button = services.ui.Button

  return (
    <MonitoringSection id="quick_actions" title="Quick Actions" count={view().all().length}>
      <SectionFilter
        label="Filter Quick Actions"
        placeholder="Filter actions"
        value={view().query()}
        change={view().setQuery}
      />
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <For
          each={[true, false].filter((selected) =>
            view()
              .visibility.visible()
              .some((id) => catalogs().preferences.favoriteQuickActions().has(id) === selected),
          )}
        >
          {(selected) => (
            <ul style={{ margin: '0', padding: '0', 'list-style': 'none' }}>
              <For
                each={view()
                  .visibility.visible()
                  .filter((id) => catalogs().preferences.favoriteQuickActions().has(id) === selected)}
              >
                {(id) => <GuiActionRow id={id} />}
              </For>
            </ul>
          )}
        </For>
        <Show when={view().filtered().length === 0}>
          <p style={{ opacity: 0.65 }}>No matching actions.</p>
        </Show>
      </div>
      <Show when={view().visibility.canToggle()}>
        <Button
          size="small"
          variant="ghost"
          onClick={() => (view().visibility.expanded() ? view().visibility.showLess() : view().visibility.showAll())}
        >
          {view().visibility.expanded() ? 'Show less' : `Show ${view().visibility.hiddenCount()} more`}
        </Button>
      </Show>
    </MonitoringSection>
  )
}
