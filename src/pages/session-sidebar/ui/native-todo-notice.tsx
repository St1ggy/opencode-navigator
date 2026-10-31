import { Show } from 'solid-js'

import { useIcons } from '../../../shared/ui'

import { SectionTab } from './section-tab'

import type { NativeTodoSetup } from '../../../entities/todo'
import type { SidebarInteraction } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function NativeTodoNotice(props: {
  api: TuiPluginApi
  setup?: NativeTodoSetup
  sessionID: string
  interaction?: SidebarInteraction
  navigationSection: number
}) {
  const icons = useIcons()
  const state = () => props.setup?.state(props.sessionID)
  const failed = () => state()?.status === 'error'
  const disabled = () => state()?.enabled === false
  const message = () => {
    if (failed()) return state()?.error

    if (state()?.status === 'loading' && state()?.enabled === undefined) return 'Checking native Todo configuration…'

    if (disabled())
      return 'Native OpenCode Todo is disabled. Enable it to let the built-in todowrite tool manage tasks.'

    return 'Native OpenCode Todo. Edit tasks through chat and todowrite.'
  }

  return (
    <box>
      <text fg={failed() ? props.api.theme.current.warning : props.api.theme.current.textMuted} wrapMode="word">
        {icons.icon('info')} {message()}
      </text>
      <Show when={props.setup && (disabled() || failed())}>
        <SectionTab
          api={props.api}
          interaction={props.interaction}
          id="opencode-navigator.todo.setup"
          position={{ section: props.navigationSection, row: 2, column: 0 }}
          label={failed() ? 'Retry Todo configuration' : 'Enable Todo…'}
          selected={false}
          disabled={state()?.status === 'saving'}
          onActivate={() =>
            failed() ? void props.setup?.refresh(props.sessionID) : props.setup?.configure(props.sessionID)
          }
        />
      </Show>
    </box>
  )
}
