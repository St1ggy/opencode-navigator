import { useRenderer } from '@opentui/solid'
import { createEffect, onCleanup } from 'solid-js'

import type { SettingsOption } from './settings-groups'
import type { ScrollBoxRenderable } from '@opentui/core'
import type { Accessor } from 'solid-js'

export function useSettingsReveal(input: {
  body: () => ScrollBoxRenderable | undefined
  options: Accessor<SettingsOption[]>
  active: Accessor<number>
  group: Accessor<string>
  optionId(value: string): string
}) {
  const renderer = useRenderer()
  let pending = true

  createEffect(() => {
    input.active()
    input.group()
    pending = true
  })
  const reveal = () => {
    if (!pending) return

    const body = input.body()
    const option = input.options()[input.active()]

    if (!body || body.isDestroyed || body.scrollHeight === 0 || !option) return

    pending = false
    body.scrollChildIntoView(input.optionId(option.value))
  }

  renderer.on('frame', reveal)
  onCleanup(() => renderer.off('frame', reveal))
}
