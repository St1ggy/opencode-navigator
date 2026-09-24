import { type Accessor, type JSX, createEffect, onCleanup } from 'solid-js'

import { PLUGIN_ID } from '../../config'
import { IconProvider } from '../icons'

import { DialogContext } from './dialog-scope'

import type { IconStyle } from '../icons'
import type { DialogFrame, DialogNavigation, DialogScope, DialogSize } from './dialog-scope'
import type { TuiDialogPromptProps, TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createDialogStack(
  api: TuiPluginApi,
  style: Accessor<IconStyle> = () => 'nerd',
  valid: () => boolean = () => true,
  corners: Accessor<boolean> = () => true,
) {
  let frames: DialogFrame[] = []
  let isReplacing = false

  function close() {
    if (frames.length === 0) return

    frames = []
    api.ui.dialog.clear()
  }

  function show() {
    const frame = frames.at(-1)

    if (!frame) return

    isReplacing = true
    try {
      api.ui.dialog.replace(
        () => <DialogBoundary scope={{ api, navigation, frame }} style={style} valid={valid} corners={corners} />,
        () => {
          if (isReplacing || frames.at(-1) !== frame) return

          queueMicrotask(() => {
            if (frames.at(-1) !== frame) return

            if (api.ui.dialog.open || !valid()) {
              frames = []

              return
            }

            frames.pop()
            show()
            const restored = frames.at(-1)
            const focus = api.renderer?.currentFocusedRenderable

            if (restored && focus)
              setTimeout(() => {
                if (frames.at(-1) === restored && !focus.isDestroyed) focus.focus()
              }, 1)
          })
        },
      )
      api.ui.dialog.setSize(frame.size)
    } finally {
      isReplacing = false
    }
  }

  const navigation: DialogNavigation = {
    open(render: () => JSX.Element, size: DialogSize = 'medium') {
      if (!valid()) return close()

      frames.push({ render, size, state: new Map() })
      show()
    },
    replace(render: () => JSX.Element, size: DialogSize = frames.at(-1)?.size ?? 'medium') {
      if (!valid()) return close()

      const frame = { render, size, state: new Map<string, unknown>() }

      if (frames.length > 0) frames[frames.length - 1] = frame
      else frames.push(frame)

      show()
    },
    back() {
      if (!valid() || frames.length <= 1) return close()

      frames.pop()
      show()
    },
    prompt(props: Omit<TuiDialogPromptProps, 'onCancel'>) {
      function showPrompt(value = props.value, retry = false) {
        const render = () => (
          <api.ui.DialogPrompt
            {...props}
            value={value}
            onCancel={navigation.back}
            onConfirm={(input) => {
              try {
                props.onConfirm?.(input)
              } catch (error) {
                api.ui.toast({
                  variant: 'error',
                  title: props.title,
                  message: error instanceof Error ? error.message : 'Invalid value',
                  duration: 4000,
                })
                showPrompt(input, true)
              }
            }}
          />
        )

        if (retry) navigation.replace(render)
        else navigation.open(render)
      }
      showPrompt()
    },
    close,
  }

  return navigation
}

function DialogBoundary(props: {
  scope: DialogScope
  style: Accessor<IconStyle>
  valid: () => boolean
  corners: Accessor<boolean>
}) {
  const unregister = props.scope.api.keymap.registerLayer({
    mode: 'modal',
    priority: 2000,
    commands: [{ name: `${PLUGIN_ID}.dialog.back`, run: props.scope.navigation.back }],
    bindings: [{ key: 'escape', cmd: `${PLUGIN_ID}.dialog.back` }],
  })

  onCleanup(unregister)
  createEffect(() => {
    if (!props.valid()) props.scope.navigation.close()
  })

  return (
    <DialogContext.Provider value={props.scope}>
      <IconProvider style={props.style} multilineCorners={props.corners}>
        {props.scope.frame.render()}
      </IconProvider>
    </DialogContext.Provider>
  )
}
