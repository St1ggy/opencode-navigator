import { createEffect, onCleanup, onMount } from 'solid-js'

import type { createStartupSessionController } from '../model/startup-session'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function StartupSessionBinding(props: {
  api: TuiPluginApi
  controller: ReturnType<typeof createStartupSessionController>
}) {
  if (props.api.keymap.on) {
    const unregister = props.api.keymap.on('dispatch', (event) => {
      if (event.phase !== 'binding-execute' || event.command !== 'session.new') return

      queueMicrotask(() => void props.controller.start())
    })

    onCleanup(unregister)
  } else
    createEffect(() => {
      if (!props.controller.enabled()) return

      const unregister = props.api.keymap.registerLayer({
        mode: 'global',
        priority: 2001,
        commands: [
          {
            name: 'session.new',
            title: 'New session',
            category: 'Session',
            namespace: 'palette',
            enabled: props.controller.enabled,
            run: () => void props.controller.start(),
          },
        ],
      })

      onCleanup(unregister)
    })

  onMount(() => void props.controller.initialize())
  onCleanup(props.controller.dispose)

  return <box />
}
