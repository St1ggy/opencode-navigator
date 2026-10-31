import { useTerminalDimensions } from '@opentui/solid'
import { createSignal, onCleanup } from 'solid-js'

import { DialogAction, DialogHeader, DialogSurface, GuardedConfirmation, useDialogs } from '../../../shared/ui'

import type { createTodoSetupController } from '../model/controller'
import type { TodoSetupPreview } from '../model/types'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function EnableTodoConfirmation(props: {
  api: TuiPluginApi
  model: ReturnType<typeof createTodoSetupController>
  preview: TodoSetupPreview
}) {
  const dialogs = useDialogs(props.api)
  const dimensions = useTerminalDimensions()
  let body: ScrollBoxRenderable | undefined
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  const [selected, setSelected] = createSignal(false)
  let disposed = false
  const confirm = async () => {
    if (busy() || error()) return

    setBusy(true)
    try {
      await props.model.apply(props.preview)

      if (!disposed && props.model.current(props.preview)) {
        dialogs.close()
        props.api.ui.toast({
          variant: 'success',
          title: 'Native Todo enabled',
          message: 'Use chat and todowrite to manage tasks.',
        })
      }
    } catch (error_) {
      if (!disposed)
        setError(
          error_ instanceof Error ? error_.message : 'Could not enable Todo. Go back and refresh before retrying.',
        )
    } finally {
      if (!disposed) setBusy(false)
    }
  }
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1100,
    commands: [
      { name: 'opencode-navigator.todo.enable.switch', run: () => setSelected(!selected()) },
      { name: 'opencode-navigator.todo.enable.confirm', run: () => (selected() ? void confirm() : dialogs.back()) },
      { name: 'opencode-navigator.todo.enable.page-up', run: () => body?.scrollBy(-5) },
      { name: 'opencode-navigator.todo.enable.page-down', run: () => body?.scrollBy(5) },
    ],
    bindings: [
      { key: 'left', cmd: 'opencode-navigator.todo.enable.switch' },
      { key: 'right', cmd: 'opencode-navigator.todo.enable.switch' },
      { key: 'return', cmd: 'opencode-navigator.todo.enable.confirm' },
      { key: 'tab', cmd: 'opencode-navigator.todo.enable.switch' },
      { key: 'pageup', cmd: 'opencode-navigator.todo.enable.page-up' },
      { key: 'pagedown', cmd: 'opencode-navigator.todo.enable.page-down' },
    ],
  })

  onCleanup(() => {
    disposed = true
    unregister()
  })

  return (
    <box>
      <GuardedConfirmation
        api={props.api}
        title="Enable native Todo"
        message="Set experimental.todo to true"
        current={() => props.model.current(props.preview)}
        onConfirm={() => void confirm()}
        render={() => (
          <DialogSurface api={props.api} lift>
            <DialogHeader api={props.api} title="Enable native Todo" icon="todo" onBack={dialogs.back} />
            <scrollbox
              ref={(node) => {
                body = node
              }}
              height={Math.min(10, Math.max(3, dimensions().height - 10))}
              flexShrink={0}
              scrollX={false}
              horizontalScrollbarOptions={{ visible: false }}
            >
              <box gap={1}>
                <text wrapMode="word" fg={props.api.theme.current.textMuted}>
                  OpenCode server configuration
                </text>
                <text wrapMode="word" fg={props.api.theme.current.text}>
                  {props.preview.path}
                </text>
                <text fg={props.api.theme.current.accent}>experimental.todo → true</text>
                <text wrapMode="word" fg={props.api.theme.current.textMuted}>
                  Preserve other settings and JSONC comments. This enables the built-in tool; it does not invoke a model
                  or edit tasks.
                </text>
                <text wrapMode="word" fg={props.api.theme.current.error}>
                  {error()}
                </text>
              </box>
            </scrollbox>
            <box id="opencode-navigator.todo.enable.actions" flexDirection="row" gap={1} flexShrink={0}>
              <DialogAction
                api={props.api}
                id="opencode-navigator.todo.enable.cancel"
                label={error() ? 'Back and refresh' : 'Cancel'}
                icon="close"
                selected={!selected()}
                onSelect={() => setSelected(false)}
                onActivate={dialogs.back}
              />
              <DialogAction
                api={props.api}
                id="opencode-navigator.todo.enable.apply"
                label={busy() ? 'Enabling…' : 'Enable Todo'}
                icon="add"
                selected={selected()}
                onSelect={() => setSelected(true)}
                onActivate={() => void confirm()}
              />
            </box>
          </DialogSurface>
        )}
      />
    </box>
  )
}
