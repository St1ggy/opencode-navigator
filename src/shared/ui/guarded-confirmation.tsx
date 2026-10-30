import { Show, createEffect } from 'solid-js'

import { useDialogs } from './dialog'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

export function GuardedConfirmation(props: {
  api: TuiPluginApi
  current: () => boolean
  title: string
  message: string
  onConfirm: () => void
  render?: (actions: { confirm: () => void; cancel: () => void }) => JSX.Element
}) {
  const dialogs = useDialogs(props.api)

  createEffect(() => {
    if (!props.current()) dialogs.close()
  })

  const confirm = () => {
    if (props.current()) props.onConfirm()
  }

  return (
    <Show
      when={props.render}
      fallback={
        <props.api.ui.DialogConfirm
          title={props.title}
          message={props.message}
          onConfirm={confirm}
          onCancel={dialogs.back}
        />
      }
    >
      {(render) => render()({ confirm, cancel: dialogs.back })}
    </Show>
  )
}
