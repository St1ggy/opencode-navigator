import { useRenderer } from '@opentui/solid'
import { createEffect, onCleanup } from 'solid-js'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'
import type { JSX } from 'solid-js'

export function WizardScrollBody(props: {
  api: TuiPluginApi
  height: number
  active?: string
  resetKey?: string
  children: JSX.Element
}) {
  const renderer = useRenderer()
  let body: ScrollBoxRenderable | undefined
  let pending = true

  createEffect(() => {
    pending = props.active !== undefined || props.resetKey !== undefined
  })
  const reveal = () => {
    if (!pending || !body || body.isDestroyed || body.scrollHeight === 0) return

    pending = false

    if (props.active) body.scrollChildIntoView(props.active)
    else if (props.resetKey) body.scrollTo(0)
  }

  renderer.on('frame', reveal)
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1001,
    commands: [
      { name: 'opencode-navigator.wizard.body.up', run: () => body?.scrollBy(-Math.max(1, props.height - 1)) },
      { name: 'opencode-navigator.wizard.body.down', run: () => body?.scrollBy(Math.max(1, props.height - 1)) },
    ],
    bindings: [
      { key: 'pageup', cmd: 'opencode-navigator.wizard.body.up' },
      { key: 'pagedown', cmd: 'opencode-navigator.wizard.body.down' },
    ],
  })

  onCleanup(() => {
    unregister()
    renderer.off('frame', reveal)
  })

  return (
    <scrollbox
      id="opencode-navigator.wizard.body"
      ref={(node) => {
        body = node
      }}
      height={props.height}
      flexShrink={0}
      scrollX={false}
      horizontalScrollbarOptions={{ visible: false }}
    >
      {props.children}
    </scrollbox>
  )
}
