import { For, Show } from 'solid-js'

import { GuiIconAction } from '../../../../shared/ui/gui'

import { useNavigatorGui } from './context'
import { MonitoringSection } from './section'
import { SectionFilter } from './section-filter'
import { GuiSkillRow } from './skill-row'

export function SkillsSection() {
  const services = useNavigatorGui()
  const catalogs = () => services.runtime.catalogs!
  const view = () => catalogs().views.skills
  const Button = services.ui.Button

  return (
    <MonitoringSection id="skills" title="Skills" count={view().all().length}>
      <SectionFilter
        label="Filter Skills"
        placeholder="Filter skills and groups"
        value={view().query()}
        change={view().setQuery}
      />
      <Show when={catalogs().skills.error()}>
        <p role="alert">{catalogs().skills.error()}</p>
        <GuiIconAction
          ui={services.ui}
          icon="refresh"
          label="Retry"
          onClick={() =>
            void catalogs()
              .skills.retry()
              .catch(() => {})
          }
        />
      </Show>
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <For each={view().groups()} fallback={<p style={{ opacity: 0.65 }}>No matching Skills.</p>}>
          {(group) => (
            <div>
              <h3 style={{ 'font-size': '12px', opacity: 0.65, margin: '0 0 4px' }}>{group}</h3>
              <ul style={{ margin: '0', padding: '0 0 0 10px', 'list-style': 'none' }}>
                <For
                  each={view()
                    .visibility.visible()
                    .filter((item) => item.bucket === group)
                    .map((item) => item.location)}
                >
                  {(location) => (
                    <Show
                      when={view()
                        .visibility.visible()
                        .find((item) => item.location === location)}
                    >
                      {(item) => <GuiSkillRow skill={item()} />}
                    </Show>
                  )}
                </For>
              </ul>
            </div>
          )}
        </For>
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
