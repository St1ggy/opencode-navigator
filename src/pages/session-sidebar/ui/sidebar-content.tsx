import { For, Match, Switch, createMemo, onCleanup } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'
import { supportsSidebarSection } from '../../../shared/lib/host-capabilities'

import { LspSection } from './lsp-section'
import { McpSection } from './mcp-section'
import { QuickActionsSection } from './quick-actions-section'
import { SectionBoundary } from './section-boundary'
import { SkillsSection } from './skill-section'
import { SubagentSection } from './subagent-section'
import { TodoSection } from './todo-section'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'
import type { SubagentController } from '../../../entities/subagent'
import type { TodoController } from '../../../entities/todo'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function SidebarContent(props: {
  api: TuiPluginApi
  mcp: McpController
  todo: TodoController
  subagents: SubagentController
  skills: SkillController
  preferences: PreferencesController
  interaction: SidebarInteraction
  sessionID: string
}) {
  const sections = props.preferences.sections
  const visibleSections = createMemo(() =>
    props.preferences
      .sectionOrder()
      .filter((section) => sections()[section] && supportsSidebarSection(props.api, section)),
  )

  onCleanup(() => props.interaction.setContentRoot(undefined))

  return (
    <box
      ref={(node: BoxRenderable) => props.interaction.setContentRoot(node)}
      id={`${PLUGIN_ID}.root`}
      focusable
      gap={1}
      on:focused={props.interaction.syncFocus}
      on:blurred={props.interaction.syncFocus}
      onKeyDown={(event) => {
        if (event.name !== 'escape' || event.defaultPrevented) return

        event.preventDefault()
        event.stopPropagation()
        props.interaction.leave()
      }}
    >
      <For each={visibleSections()}>
        {(section, index) => (
          <SectionBoundary api={props.api} divided={index() < visibleSections().length - 1}>
            <Switch>
              <Match when={section === 'todo'}>
                <TodoSection {...props} navigationSection={index() + 1} controller={props.todo} />
              </Match>
              <Match when={section === 'subagents'}>
                <SubagentSection {...props} navigationSection={index() + 1} controller={props.subagents} />
              </Match>
              <Match when={section === 'skills'}>
                <SkillsSection {...props} navigationSection={index() + 1} controller={props.skills} />
              </Match>
              <Match when={section === 'quick_actions'}>
                <QuickActionsSection {...props} navigationSection={index() + 1} />
              </Match>
              <Match when={section === 'lsp'}>
                <LspSection {...props} navigationSection={index() + 1} />
              </Match>
              <Match when={section === 'mcp'}>
                <McpSection {...props} navigationSection={index() + 1} controller={props.mcp} />
              </Match>
            </Switch>
          </SectionBoundary>
        )}
      </For>
    </box>
  )
}
