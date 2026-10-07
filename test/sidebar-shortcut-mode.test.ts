import { expect, test } from 'bun:test'

import { createSidebarShortcutMode } from '../src/features/sidebar-shortcuts'
import { setHostCapabilities } from '../src/shared/lib/host-capabilities'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Command, Layer } from '@opentui/keymap'

type TestLayer = Layer & { mode?: string }

function setup(timeoutMs = 5000, lsp = true) {
  const layers: TestLayer[] = []
  const activeLayers = new Set<TestLayer>()
  const dispatched: string[] = []
  const dispatchModes: string[] = []
  const modes = ['base']
  const toasts: { message: string }[] = []
  const api = {
    route: { current: { name: 'session' } },
    ui: {
      dialog: { open: false },
      toast: (toast: { message: string }) => toasts.push(toast),
    },
    mode: {
      current: () => modes.at(-1),
      push(mode: string) {
        modes.push(mode)

        return () => {
          const index = modes.lastIndexOf(mode)

          if (index !== -1) modes.splice(index, 1)
        }
      },
    },
    keymap: {
      registerLayer(layer: TestLayer) {
        layers.push(layer)
        activeLayers.add(layer)

        return () => activeLayers.delete(layer)
      },
      dispatchCommand(name: string) {
        dispatched.push(name)
        dispatchModes.push(modes.at(-1)!)

        return { ok: true as const }
      },
    },
  } as unknown as TuiPluginApi

  setHostCapabilities(api, { todo: true, lsp })
  const controller = createSidebarShortcutMode(api, { timeoutMs })

  function command(name: string, mode = 'base') {
    return layers
      .filter((layer) => activeLayers.has(layer) && layer.mode === mode)
      .flatMap((layer) => layer.commands ?? [])
      .find((candidate) => candidate.name === name) as Command
  }

  function press(key: string) {
    const mode = modes.at(-1)
    let layer: TestLayer | undefined

    for (let index = layers.length - 1; index >= 0; index--) {
      const candidate = layers[index]

      if (
        activeLayers.has(candidate) &&
        candidate.mode === mode &&
        candidate.bindings?.some((item) => item.key === key)
      ) {
        layer = candidate
        break
      }
    }
    const binding = layer?.bindings?.find((candidate) => candidate.key === key)

    expect(typeof binding?.cmd).toBe('string')
    command(binding?.cmd as string, mode)?.run?.({} as never)
  }

  return { controller, dispatched, dispatchModes, modes, toasts, layers, activeLayers, command, press }
}

test('only the configured binding enters mode while palette and legacy toggles stay direct', () => {
  const harness = setup()

  try {
    harness.controller.bind('ctrl+shift+b')
    const binding = harness.layers.find((layer) => layer.bindings?.[0]?.key === 'ctrl+shift+b')?.bindings?.[0]

    expect(binding?.cmd).not.toBe('opencode-navigator.toggle')
    harness.command('opencode-navigator.toggle').run?.({} as never)
    harness.command('opencode-pretty-sidebar.toggle').run?.({} as never)
    expect(harness.dispatched).toEqual(['session.sidebar.toggle', 'session.sidebar.toggle'])
    expect(harness.controller.active()).toBe(false)

    harness.press('ctrl+shift+b')
    expect(harness.controller.active()).toBe(true)
    expect(harness.modes).toEqual(['base', 'opencode-navigator.sidebar-shortcuts'])
    expect(harness.toasts.at(-1)?.message).toContain('h toggle')
    expect(harness.toasts.at(-1)?.message).toContain('c check update')
    expect(harness.toasts.at(-1)?.message).toContain('u update')
  } finally {
    harness.controller.dispose()
  }
})

test('shortcut actions dispatch existing commands and exit mode', () => {
  const harness = setup()
  const expected = {
    h: 'session.sidebar.toggle',
    t: 'opencode-navigator.focus.todo',
    a: 'opencode-navigator.focus.subagents',
    s: 'opencode-navigator.focus.skills',
    q: 'opencode-navigator.focus.quick_actions',
    l: 'opencode-navigator.focus.lsp',
    m: 'opencode-navigator.focus.mcp',
    c: 'opencode-navigator.check-update',
    u: 'opencode-navigator.update-navigator',
  }

  try {
    harness.controller.bind('ctrl+shift+b')
    for (const [key, command] of Object.entries(expected)) {
      harness.press('ctrl+shift+b')
      harness.press(key)
      expect(harness.dispatched.at(-1)).toBe(command)
      expect(harness.dispatchModes.at(-1)).toBe('base')
      expect(harness.controller.active()).toBe(false)
      expect(harness.modes).toEqual(['base'])
    }
  } finally {
    harness.controller.dispose()
  }
})

test('Escape cancels, reentry replaces the mode, and inactivity times out', async () => {
  const harness = setup(40)

  try {
    harness.controller.bind('ctrl+shift+b')
    harness.press('ctrl+shift+b')
    harness.press('escape')
    expect(harness.controller.active()).toBe(false)

    harness.press('ctrl+shift+b')
    await Bun.sleep(25)
    harness.press('ctrl+shift+b')
    expect(harness.modes).toEqual(['base', 'opencode-navigator.sidebar-shortcuts'])
    expect(
      [...harness.activeLayers].filter((layer) => layer.mode === 'opencode-navigator.sidebar-shortcuts'),
    ).toHaveLength(1)
    await Bun.sleep(25)
    expect(harness.controller.active()).toBe(true)
    await Bun.sleep(25)
    expect(harness.controller.active()).toBe(false)
    expect(harness.modes).toEqual(['base'])
  } finally {
    harness.controller.dispose()
  }
})

test('shortcut hints and bindings omit unsupported sections without hiding update actions', () => {
  const harness = setup(5000, false)

  try {
    harness.controller.bind('ctrl+shift+b')
    harness.press('ctrl+shift+b')
    expect(harness.toasts.at(-1)?.message).not.toContain('l LSP')
    expect(harness.toasts.at(-1)?.message).toContain('c check update | u update')
    expect(harness.layers.at(-1)?.bindings?.some(({ key }) => key === 'l')).toBe(false)
    harness.press('c')
    expect(harness.dispatched.at(-1)).toBe('opencode-navigator.check-update')
  } finally {
    harness.controller.dispose()
  }
})
