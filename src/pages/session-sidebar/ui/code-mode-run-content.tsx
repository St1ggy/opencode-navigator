import { createMemo } from 'solid-js'

import { ExecuteDetails, ExecuteReferences, useCodeModeTui } from '../../../features/code-mode'
import { executeCodeReferences, executeDuration } from '../../../features/code-mode/model'
import { useDialogs, useIcons } from '../../../shared/ui'

import { CodeModeAction } from './code-mode-action'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function CodeModeRunContent(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  position: SidebarPosition
  id: string
}) {
  const model = useCodeModeTui()!
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const run = () => model.runs().find((entry) => entry.id === props.id)!
  const references = createMemo(() => executeCodeReferences(run().input))
  const duration = () => {
    const value = executeDuration(run(), model.now())

    return value === 'Duration unavailable' ? 'time ?' : value
  }

  function open() {
    const saved = run()

    dialogs.open(
      () => (
        <ExecuteDetails
          api={props.api}
          run={() => model.runs().find((entry) => entry.id === props.id) ?? saved}
          now={model.now}
        />
      ),
      'large',
    )
  }

  return (
    <CodeModeAction
      {...props}
      id={`navigator.execute.${props.id}`}
      activate={open}
      render={(foreground, focused) => (
        <>
          <ExecuteReferences
            api={props.api}
            references={references()}
            limit={2}
            showOrigin={references().items.length > 0}
            foreground={foreground}
            muted={focused ? foreground : props.api.theme.current.textMuted}
          />
          <box flexDirection="row" justifyContent="space-between" gap={1} height={1}>
            <text height={1} flexGrow={1} minWidth={0} wrapMode="none" truncate fg={foreground}>
              {icons.icon(run().status === 'error' ? 'error' : run().status === 'completed' ? 'checked' : 'pending')}{' '}
              {run().status}
            </text>
            <text height={1} flexShrink={0} wrapMode="none" fg={foreground}>
              {duration()}
            </text>
          </box>
        </>
      )}
    />
  )
}
