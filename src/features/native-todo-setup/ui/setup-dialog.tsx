import { Show, createSignal, onCleanup, onMount } from 'solid-js'

import { SelectionMenu, useDialogs } from '../../../shared/ui'

import { EnableTodoConfirmation } from './enable-confirmation'
import { TodoSetupReadNotice } from './read-notice'

import type { createTodoSetupController } from '../model/controller'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function NativeTodoSetupDialog(props: {
  api: TuiPluginApi
  sessionID: string
  model: ReturnType<typeof createTodoSetupController>
}) {
  const dialogs = useDialogs(props.api)
  const [error, setError] = createSignal('')
  const [preparing, setPreparing] = createSignal(false)
  let disposed = false
  const state = () => props.model.state(props.sessionID)
  const refresh = () => void props.model.refresh(props.sessionID)

  onMount(refresh)
  onCleanup(() => {
    disposed = true
  })
  const select = async (path: string) => {
    if (preparing()) return

    setPreparing(true)
    setError('')
    try {
      const preview = await props.model.prepare(props.sessionID, path)

      if (!disposed && props.model.current(preview))
        dialogs.open(() => <EnableTodoConfirmation api={props.api} model={props.model} preview={preview} />)
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'Could not prepare this configuration. Retry.')
    } finally {
      if (!disposed) setPreparing(false)
    }
  }

  return (
    <box>
      <Show
        when={state().status === 'ready' && !error() && !preparing() && props.model.files(props.sessionID).length > 0}
        fallback={
          <TodoSetupReadNotice
            api={props.api}
            message={
              preparing()
                ? 'Preparing configuration preview…'
                : error() || state().error || 'Reading the current OpenCode configuration…'
            }
            refresh={() => {
              setError('')
              refresh()
            }}
          />
        }
      >
        <SelectionMenu
          api={props.api}
          title="Choose Todo configuration"
          adaptive
          lift
          options={[
            ...props.model.files(props.sessionID).map((path) => ({
              title: path,
              value: path,
              description: 'Existing server file. Preview the change before enabling Todo.',
              icon: 'settings' as const,
            })),
            { title: 'Cancel', value: '', description: 'Keep the configuration unchanged', icon: 'close' },
          ]}
          onSelect={(option) => (option.value ? void select(option.value) : dialogs.back())}
        />
      </Show>
    </box>
  )
}
