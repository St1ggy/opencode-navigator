import { Show } from 'solid-js'

import { PLUGIN_ID } from '../../../shared/config'

import { SectionTab } from './section-tab'

import type { NavigatorTodoController } from '../../../entities/todo'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function TodoGuidanceControl(props: {
  api: TuiPluginApi
  controller: NavigatorTodoController
  sessionID: string
  interaction?: SidebarInteraction
  navigationSection: number
}) {
  const state = () => props.controller.guidance(props.sessionID)

  return (
    <Show when={state().available}>
      <box>
        <SectionTab
          api={props.api}
          interaction={props.interaction}
          id={`${PLUGIN_ID}.todo.guidance`}
          position={{ section: props.navigationSection, row: 2, column: 0 }}
          label={`Todo instructions: ${state().enabled ? 'On' : 'Off'}`}
          selected={state().enabled}
          disabled={state().saving}
          onActivate={() => void props.controller.setGuidance(props.sessionID, !state().enabled)}
        />
        <Show when={state().error}>
          {(message) => (
            <text fg={props.api.theme.current.error} wrapMode="word">
              {message()}
            </text>
          )}
        </Show>
      </box>
    </Show>
  )
}
