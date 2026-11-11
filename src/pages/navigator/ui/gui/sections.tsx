import { For, Match, Show, Switch } from 'solid-js'

import { SIDEBAR_SECTIONS } from '../../../../shared/config'

import { ActionsSection } from './actions-section'
import { useNavigatorGui } from './context'
import { LimitsSection } from './limits-section'
import { McpSection } from './mcp-section'
import { SkillsSection } from './skills-section'
import { SubagentSection } from './subagent-section'
import { TodoSection } from './todo-section'

export function NavigatorSections() {
  const services = useNavigatorGui()
  const preferences = () => services.runtime.catalogs?.preferences
  const supported = (section: string) =>
    section !== 'lsp' && (Boolean(services.runtime.catalogs) || ['limits', 'todo', 'subagents'].includes(section))
  const sections = () =>
    (preferences()?.sectionOrder() ?? SIDEBAR_SECTIONS).filter(
      (section) => supported(section) && preferences()?.sections()[section] !== false,
    )

  return (
    <For each={sections()}>
      {(section, index) => (
        <>
          <Show when={index() > 0}>
            <hr style={{ border: '0', 'border-top': '1px solid currentColor', opacity: 0.18, margin: '14px 0' }} />
          </Show>
          <Switch>
            <Match when={section === 'limits'}>
              <LimitsSection />
            </Match>
            <Match when={section === 'todo'}>
              <TodoSection />
            </Match>
            <Match when={section === 'subagents'}>
              <SubagentSection />
            </Match>
            <Match when={section === 'skills'}>
              <SkillsSection />
            </Match>
            <Match when={section === 'quick_actions'}>
              <ActionsSection />
            </Match>
            <Match when={section === 'mcp'}>
              <McpSection />
            </Match>
          </Switch>
        </>
      )}
    </For>
  )
}
