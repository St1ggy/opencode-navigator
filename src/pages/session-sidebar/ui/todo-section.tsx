import { Show, createEffect, createMemo, createSignal, onCleanup, untrack } from 'solid-js'

import { type TodoController, type TodoViewMode, buildTodoView } from '../../../entities/todo'
import { PLUGIN_ID } from '../../../shared/config'
import { hostCapabilityUnavailable } from '../../../shared/lib/host-capabilities'
import { createListVisibility } from '../../../shared/lib/list-visibility'
import { useIcons } from '../../../shared/ui'

import { SectionRequestBody } from './request-body'
import { Section } from './section'
import { TodoContents } from './todo-contents'

import type { PreferencesController } from '../../../entities/preferences'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function TodoSection(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  controller: TodoController
  preferences: PreferencesController
  sessionID: string
  navigationSection?: number
}) {
  const list = createMemo(() => props.controller.list(props.sessionID))
  const icons = useIcons()
  const unavailable = () => hostCapabilityUnavailable(props.api, 'todo')
  const [mode, setMode] = createSignal<TodoViewMode>('all')
  const targetKey = createMemo(() => props.controller.target?.(props.sessionID).key ?? props.sessionID)

  createEffect(() => {
    targetKey()
    setMode('all')
  })
  const view = createMemo(() => buildTodoView(list(), mode()))
  const visibility = createListVisibility({
    items: () => view().rows,
    limit: () => props.preferences.sectionItemLimit?.('todo') ?? 0,
    resetKey: () => JSON.stringify([targetKey(), mode()]),
  })
  const state = createMemo(() => props.controller.state(props.sessionID))

  createEffect(() => {
    const sessionID = props.sessionID

    targetKey()

    if (unavailable()) return

    const deactivate = untrack(() => props.controller.activate?.(sessionID) ?? (() => {}))

    onCleanup(deactivate)
    untrack(() => void props.controller.refresh(sessionID).catch(() => {}))
  })
  const navigationSection = () => props.navigationSection ?? 1

  return (
    <Section
      api={props.api}
      interaction={props.interaction}
      sectionId={`${PLUGIN_ID}.section.todo`}
      navigationSection={navigationSection()}
      title="TODO"
      section="todo"
      summary={unavailable() ? '—' : `${view().counts.completed}/${list().length}`}
      open={props.preferences.expanded().todo}
      onToggle={() => props.preferences.toggleSectionExpanded('todo')}
    >
      <Show
        when={unavailable()}
        fallback={
          <SectionRequestBody
            api={props.api}
            interaction={props.interaction}
            id={`${PLUGIN_ID}.retry.todo`}
            position={{ section: navigationSection(), row: 1, column: 0 }}
            state={state()}
            hasItems={list().length > 0}
            empty="No tasks yet"
            loading="Loading tasks…"
            onRetry={() => void props.controller.retry(props.sessionID)}
          >
            <TodoContents
              api={props.api}
              interaction={props.interaction}
              navigationSection={props.navigationSection}
              mode={mode()}
              setMode={setMode}
              view={view()}
              visibility={visibility}
              density={props.preferences.rowDensity?.() ?? 'compact'}
            />
          </SectionRequestBody>
        }
      >
        {(message) => (
          <text fg={props.api.theme.current.textMuted} wrapMode="word">
            {icons.icon('info')} {message()}
          </text>
        )}
      </Show>
    </Section>
  )
}
