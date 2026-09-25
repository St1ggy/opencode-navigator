/** @jsxImportSource @opentui/solid */
import { createSignal } from 'solid-js'

import { PLUGIN_ID } from '../../shared/config'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { KeyEvent, Renderable } from '@opentui/core'

type LegacyKeymap = TuiPluginApi['keymap']
type LegacyLayer = Parameters<LegacyKeymap['registerLayer']>[0]
type LegacyCommand = NonNullable<LegacyLayer['commands']>[number]
type Enablement = boolean | (() => boolean) | undefined

function belongsTo(renderable: Renderable | null | undefined, ancestor: Renderable | null | undefined) {
  if (!renderable || !ancestor) return false

  for (let current: Renderable | null = renderable; current; current = current.parent) {
    if (current === ancestor) return true
  }

  return false
}

function enabled(value: Enablement) {
  return typeof value === 'function' ? value() : value !== false
}

export function createV2Keymap(context: Plugin.Context) {
  const [revision, setRevision] = createSignal(0)
  const layers = new Map<number, LegacyLayer>()
  let sequence = 0

  function layerActive(layer: LegacyLayer) {
    const mode = layer.mode ?? 'base'
    const target = layer.target

    return (
      (mode === 'global' || context.keymap.mode.current() === mode) &&
      enabled(layer.enabled as Enablement) &&
      (!target || belongsTo(context.renderer.currentFocusedRenderable, target))
    )
  }

  function legacyCommand(name: string) {
    return [...layers]
      .sort(([leftID, left], [rightID, right]) => (right.priority ?? 0) - (left.priority ?? 0) || rightID - leftID)
      .flatMap(([, layer]) => (layerActive(layer) ? [layer] : []))
      .flatMap((layer) => layer.commands ?? [])
      .find((command) => command.name === name && enabled(command.enabled as Enablement))
  }

  function run(command: LegacyCommand, input = '', event?: unknown) {
    return command.run({
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

  async function runV2(command: LegacyCommand, input = '', event?: KeyEvent) {
    await run(command, input, event)
  }

  const onKeypress = (event: KeyEvent) => {
    if (event.name !== ',' || !event.ctrl || event.shift || event.meta || event.super || event.hyper) return

    const command = legacyCommand(`${PLUGIN_ID}.settings`)

    if (!command) return

    event.preventDefault()
    event.stopPropagation()
    void runV2(command, '', event)
  }

  context.renderer.keyInput.on('keypress', onKeypress)

  function v2Commands(id: number, layer: LegacyLayer) {
    const available = () => layerActive(layer)
    const named = (layer.commands ?? []).map((command) => ({
      id: command.name,
      title: command.title as string | undefined,
      description: command.desc as string | undefined,
      group: command.category as string | undefined,
      palette: command.namespace === 'palette' ? (true as const) : undefined,
      suggested: command.suggested as Enablement,
      enabled: () => available() && enabled(command.enabled as Enablement),
      run: (input?: string, event?: KeyEvent) => runV2(command, input, event),
    }))
    const bindings = (layer.bindings ?? []).flatMap((binding, index) =>
      typeof binding.key === 'string'
        ? [
            {
              id: `${PLUGIN_ID}.v2-binding.${id}.${index}`,
              bind: binding.key,
              enabled: available,
              run: () => {
                context.keymap.dispatch(String(binding.cmd))
              },
            },
          ]
        : [],
    )

    return [...named, ...bindings]
  }

  function Bridge() {
    // The v2 host tracks this callback; the analyzer only recognizes Solid-owned callbacks.
    // eslint-disable-next-line solid/reactivity
    context.keymap.layer(() => {
      revision()
      const current = [...layers].sort(
        ([leftID, left], [rightID, right]) => (right.priority ?? 0) - (left.priority ?? 0) || rightID - leftID,
      )
      const commands = current.flatMap(([id, layer]) => v2Commands(id, layer))
      const bindings = commands.flatMap((command) => (command.id ? [command.id] : []))

      return { mode: 'global', priority: 2000, commands, bindings }
    })

    return <box />
  }

  const keymap = {
    registerLayer(layer: LegacyLayer) {
      const id = ++sequence

      layers.set(id, layer)
      setRevision((value) => value + 1)

      return () => {
        if (!layers.delete(id)) return

        setRevision((value) => value + 1)
      }
    },
    dispatchCommand(name: string, options?: { payload?: unknown }) {
      const command = context.keymap.commands().find((candidate) => candidate.id === name)

      if (command) {
        if (!enabled(command.enabled)) return { ok: false, reason: 'disabled', command }

        context.keymap.dispatch(name, typeof options?.payload === 'string' ? options.payload : undefined)

        return { ok: true, command }
      }

      const fallback = legacyCommand(name)

      if (!fallback) return { ok: false, reason: 'not-found' }

      run(fallback)

      return { ok: true, command: fallback }
    },
    getCommands() {
      return context.keymap.commands().flatMap((command) => {
        if (!command.id) return []

        const name = command.id

        return [{ ...command, name, run: () => context.keymap.dispatch(name) }]
      }) as ReturnType<LegacyKeymap['getCommands']>
    },
    getCommandBindings(input: { commands: readonly string[] }) {
      return new Map(input.commands.map((name) => [name, [...context.keymap.shortcuts(name)]]))
    },
    parseKeySequence(value: string) {
      return value.trim() ? value.trim().split(/\s+/u) : []
    },
  } as unknown as LegacyKeymap

  return {
    keymap,
    Bridge,
    dispose: () => {
      context.renderer.keyInput.off('keypress', onKeypress)
    },
  }
}
