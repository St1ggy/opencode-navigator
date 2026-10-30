import { createEffect, onCleanup } from 'solid-js'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Accessor } from 'solid-js'

export function registerBugReportNavigation(input: {
  api: TuiPluginApi
  active: Accessor<number>
  focus(index: number): void
  activate(index: number): void
  send(): void
}) {
  const prefix = 'opencode-navigator.bug-report'

  createEffect(() => {
    const actionsFocused = input.active() >= 2
    const unregister = input.api.keymap.registerLayer({
      mode: 'modal',
      priority: 1100,
      commands: [
        { name: `${prefix}.next`, run: () => input.focus((input.active() + 1) % 6) },
        { name: `${prefix}.previous`, run: () => input.focus((input.active() + 5) % 6) },
        { name: `${prefix}.send`, run: input.send },
        { name: `${prefix}.title-next`, run: () => input.focus(1) },
        {
          name: `${prefix}.activate`,
          enabled: () => input.active() >= 2,
          run: () => input.activate(input.active() - 2),
        },
        {
          name: `${prefix}.up`,
          enabled: () => input.active() >= 2,
          run: () => input.focus(input.active() === 2 ? 5 : input.active() - 1),
        },
        {
          name: `${prefix}.down`,
          enabled: () => input.active() >= 2,
          run: () => input.focus(input.active() === 5 ? 2 : input.active() + 1),
        },
      ],
      bindings: [
        { key: 'tab', cmd: `${prefix}.next` },
        { key: 'shift+tab', cmd: `${prefix}.previous` },
        { key: 'ctrl+return', cmd: `${prefix}.send` },
        ...(input.active() === 0 ? [{ key: 'return', cmd: `${prefix}.title-next` }] : []),
        ...(actionsFocused
          ? [
              { key: 'return', cmd: `${prefix}.activate` },
              { key: 'up', cmd: `${prefix}.up` },
              { key: 'down', cmd: `${prefix}.down` },
            ]
          : []),
      ],
    })

    onCleanup(unregister)
  })
}
