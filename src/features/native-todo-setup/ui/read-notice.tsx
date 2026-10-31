import { onCleanup } from 'solid-js'

import { DialogAction, DialogHeader, DialogSurface, useDialogs } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function TodoSetupReadNotice(props: { api: TuiPluginApi; message: string; refresh(): void }) {
  const dialogs = useDialogs(props.api)
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1100,
    commands: [{ name: 'opencode-navigator.todo.setup.retry', run: props.refresh }],
    bindings: [{ key: 'return', cmd: 'opencode-navigator.todo.setup.retry' }],
  })

  onCleanup(unregister)

  return (
    <DialogSurface api={props.api} lift>
      <DialogHeader api={props.api} title="Enable native Todo" icon="todo" onBack={dialogs.back} />
      <text wrapMode="word" fg={props.api.theme.current.textMuted}>
        {props.message}
      </text>
      <DialogAction
        api={props.api}
        id="opencode-navigator.todo.setup.retry"
        label="Refresh configuration"
        icon="retry"
        selected
        onSelect={() => {}}
        onActivate={props.refresh}
      />
    </DialogSurface>
  )
}
