import { createRoot, createSignal, getOwner } from 'solid-js'

import { PLUGIN_ID } from '../../shared/config'

import { enabled, v2LayerCommands } from './keymap-commands'

import type { LegacyCommand, LegacyLayer } from './keymap-commands'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { KeyEvent, Renderable } from '@opentui/core'

type LegacyKeymap = TuiPluginApi['keymap']
const SETTINGS_COMMAND = 'opencode.settings'
const PERMISSIONS_ACTION = 'permission.mode'

export function createV2Keymap(context: Plugin.Context) {
  const cleanups = new Set<() => void>()
  let sequence = 0

  async function run(command: LegacyCommand, input = '', event?: KeyEvent) {
    await command.run({
      keymap,
      event,
      focused: context.renderer.currentFocusedRenderable,
      target: context.renderer.currentFocusedRenderable,
      data: {},
      command,
      input,
      payload: undefined,
    } as never)
  }
  const onKeypress = (event: KeyEvent) => {
    if (event.name !== ',' || !event.ctrl || event.shift || event.meta || event.super || event.hyper) return

    const command = context.keymap.commands().find((item) => item.id === `${PLUGIN_ID}.settings`)

    if (!command || !enabled(command.enabled)) return

    event.preventDefault()
    event.stopPropagation()
    context.keymap.dispatch(command.id!)
  }

  // The public string-only binding grammar expands literal commas as alternatives.
  context.renderer.keyInput.on('keypress', onKeypress)
  const keymap = {
    registerLayer(layer: LegacyLayer) {
      const id = ++sequence
      const owner = getOwner()
      const [active, setActive] = createSignal(true)
      const install = () => {
        context.keymap.layer(() => ({
          mode: typeof layer.mode === 'string' ? layer.mode : 'base',
          priority: layer.priority,
          enabled: () => active() && enabled(layer.enabled as boolean | (() => boolean) | undefined),
          target: layer.target ? () => layer.target : undefined,
          commands: v2LayerCommands(id, layer, () => true, run, context.keymap.dispatch),
        }))
      }
      let release: (() => void) | undefined

      if (owner)
        release = createRoot((cleanup) => {
          install()

          return cleanup
        }, owner)
      else install()

      const dispose = () => {
        setActive(false)
        release?.()
      }

      cleanups.add(dispose)

      return () => {
        cleanups.delete(dispose)
        dispose()
      }
    },
    dispatchCommand(
      name: string,
      options?: { payload?: unknown; focused?: Renderable | null; target?: Renderable | null },
    ) {
      const target = options?.focused ?? options?.target

      if (target?.parent && !target.isDestroyed) target.focus()

      const command = context.keymap
        .commands()
        .find((item) => item.id === (name === PERMISSIONS_ACTION ? SETTINGS_COMMAND : name))

      if (!command) return { ok: false, reason: 'not-found' }

      if (!enabled(command.enabled)) return { ok: false, reason: 'disabled', command }

      context.keymap.dispatch(command.id!, typeof options?.payload === 'string' ? options.payload : undefined)

      return { ok: true, command }
    },
    getCommands() {
      const commands = context.keymap.commands()
      const result = commands.flatMap((command) =>
        command.id ? [{ ...command, name: command.id, run: () => context.keymap.dispatch(command.id!) }] : [],
      )
      const settings = commands.find((item) => item.id === SETTINGS_COMMAND)

      if (settings)
        result.push({
          ...settings,
          id: PERMISSIONS_ACTION,
          name: PERMISSIONS_ACTION,
          title: 'Permissions settings',
          run: () => context.keymap.dispatch(SETTINGS_COMMAND),
        })

      return result as ReturnType<LegacyKeymap['getCommands']>
    },
    getCommandBindings(input: { commands: readonly string[] }) {
      return new Map(input.commands.map((name) => [name, [...context.keymap.shortcuts(name)]]))
    },
  } as unknown as LegacyKeymap

  return {
    keymap,
    dispose() {
      for (const cleanup of cleanups) cleanup()
      cleanups.clear()
      context.renderer.keyInput.off('keypress', onKeypress)
    },
  }
}
