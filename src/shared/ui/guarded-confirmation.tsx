import { createEffect } from 'solid-js'

import { useDialogs } from './dialog'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function GuardedConfirmation(props: {
  api: TuiPluginApi
  current: () => boolean
  title: string
  message: string
  onConfirm: () => void
}) {
  const dialogs = useDialogs(props.api)

  createEffect(() => {
    if (!props.current()) dialogs.close()
  })

  return (
    <props.api.ui.DialogConfirm
      title={props.title}
      message={props.message}
      onConfirm={() => {
        if (props.current()) props.onConfirm()
      }}
      onCancel={dialogs.back}
    />
  )
}
