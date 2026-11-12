/** @jsxImportSource @opentui/solid */
import { onMount } from 'solid-js'

import { SingleLinePrompt } from '../../shared/ui'

import type { TuiDialogConfirmProps, TuiDialogPromptProps, TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Plugin } from '@opencode/plugin/tui'

export function createV2UI(context: Plugin.Context, api: () => TuiPluginApi) {
  let dialogOpen = false
  let dialogGeneration = 0
  let handingOff = false

  function DialogPrompt(props: TuiDialogPromptProps) {
    // Native promise prompts replace Navigator frames; keep nested drafts in-frame.
    return <SingleLinePrompt api={api()} {...props} />
  }

  function DialogConfirm(props: TuiDialogConfirmProps) {
    const generation = dialogGeneration

    async function confirm() {
      // The native promise dialog replaces this component; that unmount is not cancellation.
      handingOff = true
      try {
        return context.ui.dialog.confirm({ title: props.title, message: props.message })
      } finally {
        handingOff = false
      }
    }
    onMount(() => {
      void confirm()
        .catch(() => false)
        .then((confirmed) => {
          if (generation !== dialogGeneration || api().lifecycle.signal.aborted) return

          dialogOpen = false

          // Undefined also means replacement. A still-active host modal must keep ownership.
          if (context.keymap.mode.current() === 'modal') return

          if (confirmed) props.onConfirm?.()
          else props.onCancel?.()
        })
    })

    return <box />
  }

  return {
    DialogConfirm,
    DialogPrompt,
    toast: (input: Parameters<TuiPluginApi['ui']['toast']>[0]) => context.ui.toast.show(input),
    dialog: {
      replace(render: () => unknown, onClose?: () => void) {
        const generation = ++dialogGeneration

        dialogOpen = true
        context.ui.dialog.show(render as never, () => {
          if (handingOff || generation !== dialogGeneration) return

          dialogGeneration++
          dialogOpen = false
          onClose?.()
        })
      },
      setSize(size: 'medium' | 'large' | 'xlarge') {
        context.ui.dialog.set({ size })
      },
      clear() {
        dialogGeneration++
        dialogOpen = false
        context.ui.dialog.clear()
      },
      get open() {
        return dialogOpen
      },
    },
  }
}
