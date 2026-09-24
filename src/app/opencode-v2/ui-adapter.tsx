/** @jsxImportSource @opentui/solid */
import { onCleanup, onMount } from 'solid-js'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiDialogPromptProps, TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createV2UI(context: Plugin.Context) {
  let dialogOpen = false

  function DialogPrompt(props: TuiDialogPromptProps) {
    let active = true

    onCleanup(() => {
      active = false
    })
    onMount(async () => {
      const value = await context.ui.dialog.prompt({
        title: props.title,
        placeholder: props.placeholder,
        value: props.value,
      })

      if (!active) return

      if (value === undefined) props.onCancel?.()
      else props.onConfirm?.(value)
    })

    return <box />
  }

  return {
    DialogPrompt,
    toast: (input: Parameters<TuiPluginApi['ui']['toast']>[0]) => context.ui.toast.show(input),
    dialog: {
      replace(render: () => unknown, onClose?: () => void) {
        dialogOpen = true
        context.ui.dialog.show(render as never, () => {
          dialogOpen = false
          onClose?.()
        })
      },
      setSize(size: 'medium' | 'large' | 'xlarge') {
        context.ui.dialog.set({ size })
      },
      clear() {
        dialogOpen = false
        context.ui.dialog.clear()
      },
      get open() {
        return dialogOpen
      },
    },
  }
}
