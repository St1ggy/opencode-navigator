import { PLUGIN_ID } from '../../shared/config'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { KeyEvent, Renderable } from '@opentui/core'

export type LegacyLayer = Parameters<TuiPluginApi['keymap']['registerLayer']>[0]
export type LegacyCommand = NonNullable<LegacyLayer['commands']>[number]
export type Enablement = boolean | (() => boolean) | undefined

export function enabled(value: Enablement) {
  return typeof value === 'function' ? value() : value !== false
}

export function belongsTo(renderable: Renderable | null | undefined, ancestor: Renderable | null | undefined) {
  if (!renderable || !ancestor) return false

  for (let current: Renderable | null = renderable; current; current = current.parent) {
    if (current === ancestor) return true
  }

  return false
}

export function v2LayerCommands(
  id: number,
  layer: LegacyLayer,
  available: () => boolean,
  run: (command: LegacyCommand, input?: string, event?: KeyEvent) => Promise<void>,
  dispatch: (name: string) => void,
) {
  const named = (layer.commands ?? []).map((command) => ({
    id: command.name,
    bind: command.name === 'session.new' ? '<leader>n' : undefined,
    title: command.title as string | undefined,
    description: command.desc as string | undefined,
    group: command.category as string | undefined,
    palette: command.namespace === 'palette' ? (true as const) : undefined,
    suggested: command.suggested as Enablement,
    enabled: () => available() && enabled(command.enabled as Enablement),
    run: (input?: string, event?: KeyEvent) => run(command, input, event),
  }))
  const bindings = (layer.bindings ?? []).flatMap((binding, index) =>
    typeof binding.key === 'string'
      ? [
          {
            id: `${PLUGIN_ID}.v2-binding.${id}.${index}`,
            bind: binding.key,
            enabled: available,
            run: () => dispatch(String(binding.cmd)),
          },
        ]
      : [],
  )

  return [...named, ...bindings]
}
