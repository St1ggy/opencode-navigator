import {
  type Accessor,
  type JSX,
  type Signal,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
} from 'solid-js'

import { PLUGIN_ID } from '../constants'
import { IconProvider, useIcons } from '../icons/context'

import type { IconStyle } from '../icons/ui'
import type { TuiDialogPromptProps, TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

type DialogSize = 'medium' | 'large' | 'xlarge'
type DialogFrame = { render: () => JSX.Element; size: DialogSize; state: Map<string, unknown> }
type DialogScope = { api: TuiPluginApi; navigation: DialogNavigation; frame: DialogFrame }
const DialogContext = createContext<DialogScope>()

export function createDialogStack(
  api: TuiPluginApi,
  style: Accessor<IconStyle> = () => 'nerd',
  valid: () => boolean = () => true,
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
        () => <DialogBoundary scope={{ api, navigation, frame }} style={style} valid={valid} />,
        () => {
          if (isReplacing || frames.at(-1) !== frame) return

          // Native dialog close controls clear the host before we can restore a parent.
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

            // Run after the host's delayed refocus of the original launcher.
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

  const navigation = {
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

export type DialogNavigation = ReturnType<typeof createDialogStack>

function DialogBoundary(props: { scope: DialogScope; style: Accessor<IconStyle>; valid: () => boolean }) {
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
      <IconProvider style={props.style}>{props.scope.frame.render()}</IconProvider>
    </DialogContext.Provider>
  )
}

export function useDialogs(api: TuiPluginApi): DialogNavigation {
  const scope = useContext(DialogContext)
  const icons = useIcons()

  if (scope?.api === api) return scope.navigation

  return {
    ...createDialogStack(api, icons.style),
    back: () => api.ui.dialog.clear(),
    close: () => api.ui.dialog.clear(),
  }
}

export function useDialogState<T>(key: string, initial: T): Signal<T> {
  const scope = useContext(DialogContext)

  if (!scope) return createSignal(initial)

  const saved = scope.frame.state.get(key) as Signal<T> | undefined

  if (saved) return saved

  const state = createSignal(initial)

  scope.frame.state.set(key, state)

  return state
}

export function useDialogScroll(key = 'scroll') {
  const [position, setPosition] = useDialogState(key, 0)
  let body: ScrollBoxRenderable | undefined
  let isPending = true

  return {
    ref(node: ScrollBoxRenderable) {
      body = node
    },
    restore() {
      if (!isPending || !body) return

      isPending = false
      body.scrollTo(position())
    },
    save() {
      if (body && !body.isDestroyed) setPosition(body.scrollTop)
    },
  }
}
