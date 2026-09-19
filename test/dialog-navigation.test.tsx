/** @jsxImportSource @opentui/solid */
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui'
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { type JSX, Show, createSignal } from 'solid-js'

import { pluginConfig } from '../src/config'
import { type PreferencesController, createPreferencesController } from '../src/controllers/preferences'
import { createDialogStack, useDialogState, useDialogs } from '../src/dialogs/context'
import { openMcpPresets } from '../src/dialogs/mcp-presets'
import { openSettings } from '../src/dialogs/settings'
import { emptyPreferencesDocument } from '../src/preferences-schema'
import { applyPreferencesUpdate } from '../src/preferences-store'

import type { McpController } from '../src/controllers/mcp'
import type { TuiDialogPromptProps, TuiPluginApi } from '@opencode-ai/plugin/tui'

async function harness() {
  const [modal, setModal] = createSignal<() => JSX.Element>()
  let onClose: (() => void) | undefined
  let size = 'medium'
  let layers = 0
  let api!: TuiPluginApi
  let preferences!: PreferencesController
  let prompt!: TuiDialogPromptProps

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    const register = keymap.registerLayer.bind(keymap)

    keymap.registerLayer = (layer) => {
      const copy = { ...layer }

      Reflect.deleteProperty(copy, 'mode')
      const dispose = register(copy)

      layers++

      return () => {
        layers--
        dispose()
      }
    }
    api = {
      renderer,
      keymap,
      route: { current: { name: 'home' } },
      state: { path: { directory: '/repo', worktree: '/repo' } },
      theme: {
        current: {
          text: '#ffffff',
          textMuted: '#888888',
          accent: '#00ffff',
          primary: '#00ffff',
          backgroundElement: '#222222',
          backgroundPanel: '#111111',
        },
      },
      ui: {
        toast() {},
        dialog: {
          get open() {
            return Boolean(modal())
          },
          setSize(value: string) {
            size = value
          },
          replace(render: () => JSX.Element, close?: () => void) {
            onClose?.()
            onClose = close
            size = 'medium'
            setModal(() => render)
          },
          clear() {
            onClose?.()
            onClose = undefined
            size = 'medium'
            setModal(undefined)
          },
        },
        DialogPrompt(props: TuiDialogPromptProps) {
          prompt = props

          return (
            <box>
              <text>{props.title}</text>
              <text onMouseUp={() => api.ui.dialog.clear()}>Native close</text>
            </box>
          )
        },
      },
    } as unknown as TuiPluginApi
    keymap.registerLayer({
      commands: [{ name: 'host.close', run: () => api.ui.dialog.clear() }],
      bindings: [{ key: 'escape', cmd: 'host.close' }],
    })
    let document = emptyPreferencesDocument()

    preferences = createPreferencesController(api, pluginConfig(undefined), {
      load: async () => document,
      update: async (update) => {
        document = applyPreferencesUpdate(document, update)
      },
      flush: async () => {},
    })

    return (
      <Show keyed when={modal()}>
        {(render) => render()}
      </Show>
    )
  }
  const setup = await testRender(() => <Harness />, { width: 100, height: 40 })

  await preferences.load()
  await setup.flush()

  return {
    ...setup,
    api,
    preferences,
    modal,
    size: () => size,
    layers: () => layers,
    prompt: () => prompt,
    async escape() {
      setup.mockInput.pressEscape()
      await Bun.sleep(60)
      await setup.flush()
    },
  }
}

test('dialog stack restores frame state and size, handles native closes, and unregisters modal bindings', async () => {
  const h = await harness()
  const stack = createDialogStack(h.api)
  let increment!: () => void
  let nested!: () => void

  function Parent() {
    const [count, setCount] = useDialogState('count', 0)
    const dialogs = useDialogs(h.api)

    increment = () => setCount((value) => value + 1)
    nested = () => dialogs.open(() => <h.api.ui.DialogPrompt title="Child" />)

    return <text>Parent {count()}</text>
  }
  try {
    stack.open(() => <Parent />, 'xlarge')
    await h.flush()
    increment()
    nested()
    await h.flush()
    expect(h.size()).toBe('medium')
    expect(h.layers()).toBe(2)
    await h.escape()
    expect(h.captureCharFrame()).toContain('Parent 1')
    expect(h.size()).toBe('xlarge')
    nested()
    await h.flush()
    const lines = h.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes('Native close'))

    await h.mockMouse.click(lines[row].indexOf('Native close'), row)
    await h.flush()
    expect(h.captureCharFrame()).toContain('Parent 1')
    expect(h.size()).toBe('xlarge')
    nested()
    await h.flush()
    h.api.ui.dialog.replace(() => <text>External dialog</text>)
    await h.flush()
    expect(h.captureCharFrame()).toContain('External dialog')
    expect(h.layers()).toBe(1)
    h.api.ui.dialog.clear()
    await h.flush()
    expect(h.modal()).toBeUndefined()
    stack.open(() => <Parent />)
    await h.flush()
    expect(h.captureCharFrame()).toContain('Parent 0')
    await h.escape()
    expect(h.modal()).toBeUndefined()
    expect(h.layers()).toBe(1)
  } finally {
    h.renderer.destroy()
  }
})

test('settings preserve their tab through nested preset actions, rename cancellation and prompt validation', async () => {
  const h = await harness()
  const chooseRename = async () => {
    const lines = h.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes('Rename'))

    await h.mockMouse.click(lines[row].indexOf('Rename'), row)
  }

  try {
    h.preferences.saveLayoutPreset('Work')
    openSettings(h.api, h.preferences, 'preset:custom:Work')
    await h.flush()
    h.mockInput.pressEnter()
    await h.flush()
    expect(h.captureCharFrame()).toContain('Update from current')
    await chooseRename()
    await h.flush()
    expect(h.prompt().title).toBe('Rename layout preset')
    h.prompt().onCancel?.()
    await h.flush()
    expect(h.captureCharFrame()).toContain('Update from current')
    await h.mockMouse.moveTo(99, 39)
    h.mockInput.pressEnter()
    await h.flush()
    h.prompt().onConfirm?.('')
    await h.flush()
    expect(h.captureCharFrame()).toContain('Rename layout preset')
    await h.escape()
    expect(h.captureCharFrame()).toContain('Work')
    await h.escape()
    expect(h.captureCharFrame()).toContain('Save as…')
    expect(h.size()).toBe('xlarge')
    h.mockInput.pressEnter()
    await h.flush()
    expect(h.captureCharFrame()).toContain('Update from current')
    await h.escape()
    await h.escape()
    expect(h.modal()).toBeUndefined()
    expect(h.layers()).toBe(1)
  } finally {
    h.renderer.destroy()
  }
})

test('MCP rename cancellation returns through actions to the preset list', async () => {
  const h = await harness()
  const controller = {} as McpController

  try {
    h.preferences.saveMcpPreset('Work', { wiki: 'enabled' })
    expect(Object.keys(h.preferences.mcpPresets())).toEqual(['Work'])
    openMcpPresets(h.api, controller, h.preferences)
    await h.flush()
    expect(h.captureCharFrame()).toContain('Work')
    await h.mockMouse.moveTo(99, 39)
    h.mockInput.pressArrow('down')
    await h.flush()
    h.mockInput.pressEnter()
    await h.flush()
    expect(h.captureCharFrame()).toContain('Update from current')
    h.mockInput.pressArrow('down')
    await h.flush()
    h.mockInput.pressArrow('down')
    await h.flush()
    h.mockInput.pressEnter()
    await h.flush()
    expect(h.prompt().title).toBe('Rename MCP preset')
    h.prompt().onCancel?.()
    await h.flush()
    expect(h.captureCharFrame()).toContain('Update from current')
    h.mockInput.pressEnter()
    await h.flush()
    expect(h.prompt().title).toBe('Rename MCP preset')
    await h.escape()
    await h.escape()
    expect(h.captureCharFrame()).toContain('Save current')
    await h.escape()
    expect(h.modal()).toBeUndefined()
  } finally {
    h.renderer.destroy()
  }
})
