import { type Signal, createSignal, useContext } from 'solid-js'

import { useIcons } from '../icons'

import { DialogContext, type DialogNavigation } from './dialog-scope'
import { createDialogStack } from './dialog-stack'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function useDialogs(api: TuiPluginApi): DialogNavigation {
  const scope = useContext(DialogContext)
  const icons = useIcons()

  if (scope?.api === api) return scope.navigation

  return {
    ...createDialogStack(api, icons.style, () => true, icons.multilineCorners),
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
