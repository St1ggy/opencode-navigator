/** @jsxImportSource @opentui/solid */
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui'
import { testRender, useRenderer } from '@opentui/solid'
import { type JSX, Show, createSignal } from 'solid-js'

import {
  applyPreferencesUpdate,
  createPreferencesController,
  emptyPreferencesDocument,
} from '../../src/entities/preferences'
import { createSkillController } from '../../src/entities/skill'
import { pluginConfig } from '../../src/shared/config'
import { IconProvider } from '../../src/shared/ui'

import type { TuiDialogPromptProps, TuiPluginApi } from '@opencode-ai/plugin/tui'

export async function toolbarHarness(
  render?: (
    api: TuiPluginApi,
    preferences: ReturnType<typeof createPreferencesController>,
    skills: ReturnType<typeof createSkillController>,
  ) => JSX.Element,
  width = 76,
) {
  const [modal, setModal] = createSignal<() => JSX.Element>()
  const [route, setRoute] = createSignal({ name: 'session', params: { sessionID: 'session-one' } })
  const [permission, setPermission] = createSignal(false)
  const [style, setStyle] = createSignal<'nerd' | 'text'>('nerd')
  const toasts: unknown[] = []
  const dispatched: string[] = []
  let onClose: (() => void) | undefined
  let api!: TuiPluginApi
  let preferences!: ReturnType<typeof createPreferencesController>
  let skills!: ReturnType<typeof createSkillController>
  let prompt!: TuiDialogPromptProps
  const source = [{ name: 'review', location: '/synthetic/review', content: 'Review', description: 'Check changes' }]

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    const register = keymap.registerLayer.bind(keymap)

    keymap.registerLayer = (layer) => {
      const copy = { ...layer }

      Reflect.deleteProperty(copy, 'mode')

      return register(copy)
    }
    api = {
      renderer,
      keymap,
      app: { version: '1.19.3' },
      route: {
        get current() {
          return route()
        },
      },
      state: {
        path: { directory: '/synthetic', worktree: '/synthetic' },
        session: { get: () => ({ directory: '/synthetic' }) },
      },
      theme: {
        current: {
          text: '#ffffff',
          textMuted: '#888888',
          accent: '#00ffff',
          primary: '#00ffff',
          backgroundElement: '#333333',
          backgroundPanel: '#111111',
          selectedListItemText: '#111111',
          warning: '#ffff00',
        },
      },
      event: { on: () => () => {} },
      lifecycle: { signal: new AbortController().signal, onDispose() {} },
      client: { app: { skills: async () => ({ data: source }) }, tui: { appendPrompt: async () => ({ data: true }) } },
      ui: {
        toast: (value: unknown) => toasts.push(value),
        dialog: {
          get open() {
            return Boolean(modal())
          },
          setSize() {},
          replace(next: () => JSX.Element, close?: () => void) {
            onClose?.()
            onClose = close
            setModal(() => next)
          },
          clear() {
            onClose?.()
            onClose = undefined
            setModal(undefined)
          },
        },
        DialogPrompt(props: TuiDialogPromptProps) {
          prompt = props

          return <text>{props.title}</text>
        },
      },
    } as unknown as TuiPluginApi
    keymap.registerLayer({
      commands: [{ name: 'host.escape', run: () => api.ui.dialog.clear() }],
      bindings: [{ key: 'escape', cmd: 'host.escape' }],
    })
    keymap.registerLayer({
      commands: [
        {
          name: 'permission.mode',
          get title() {
            return permission() ? 'Disable auto-approve permissions' : 'Enable auto-approve permissions'
          },
          run: () => {
            setPermission(!permission())
            dispatched.push('permission.mode')
          },
        },
        {
          name: 'session.new',
          title: 'New session',
          run: () => {
            dispatched.push('session.new')
          },
        },
      ],
    })
    let document = emptyPreferencesDocument()

    preferences = createPreferencesController(api, pluginConfig(undefined), {
      load: async () => document,
      update: async (update) => {
        document = applyPreferencesUpdate(document, update)
      },
      flush: async () => {},
    })
    skills = createSkillController(api)

    return (
      <IconProvider style={style}>
        <box width="100%" height="100%">
          {render?.(api, preferences, skills)}
          <Show keyed when={modal()}>
            {(view) => view()}
          </Show>
        </box>
      </IconProvider>
    )
  }
  const h = await testRender(() => <Harness />, { width, height: 40 })

  await preferences.load()
  await skills.refresh()
  await h.flush()
  async function wait(label: string) {
    for (let attempt = 0; attempt < 50; attempt++) {
      await h.flush()

      if (h.captureCharFrame().includes(label)) return

      await Bun.sleep(5)
    }
    throw new Error(`Missing ${label}: ${h.captureCharFrame()}`)
  }
  async function click(label: string) {
    await wait(label)
    const lines = h.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes(label))

    await h.mockMouse.click(lines[row].indexOf(label), row)
    await h.flush()
  }

  return {
    ...h,
    api,
    preferences,
    skills,
    source,
    dispatched,
    toasts,
    prompt: () => prompt,
    setRoute,
    setStyle,
    setPermission,
    wait,
    click,
  }
}
