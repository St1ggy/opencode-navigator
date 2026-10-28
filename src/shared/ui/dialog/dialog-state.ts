import { useRenderer } from '@opentui/solid'
import { type Signal, createSignal, onCleanup, useContext } from 'solid-js'

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
  const renderer = useRenderer()
  const [position, setPosition] = useDialogState(key, 0)
  let body: ScrollBoxRenderable | undefined
  let isPending = true

  function restore() {
    if (!isPending || !body || body.isDestroyed) return

    if (position() > 0 && body.scrollHeight === 0) return

    isPending = false
    body.scrollTo(position())
  }
  function save() {
    if (!isPending && body && !body.isDestroyed) setPosition(body.scrollTop)
  }
  const frame = () => {
    restore()
    save()
  }

  renderer.on('frame', frame)
  onCleanup(() => {
    save()
    renderer.off('frame', frame)
  })

  return {
    ref(node: ScrollBoxRenderable) {
      body = node
      renderer.requestRender()
    },
    restore,
    save,
  }
}
