/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { StartupSessionBinding, createStartupSessionController } from '../src/features/startup-session'

import type { PreferencesController } from '../src/entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function setup(initial: 'home' | 'session', enabled = false) {
  let route: { name: string; params?: { sessionID: string } } =
    initial === 'home' ? { name: 'home' } : { name: 'session', params: { sessionID: 'existing' } }
  let directory = '/workspace'
  const [allowed, setAllowed] = createSignal(enabled)
  let open = false
  const created: string[] = []
  const navigated: string[] = []
  const toasts: string[] = []
  const layers: unknown[] = []
  const api = {
    route: {
      get current() {
        return route
      },
      navigate(_name: string, params: { sessionID: string }) {
        navigated.push(params.sessionID)
        route = { name: 'session', params }
      },
    },
    state: { path: { directory: '/workspace' }, session: { get: () => ({ directory }) } },
    lifecycle: { signal: new AbortController().signal },
    ui: {
      dialog: {
        get open() {
          return open
        },
      },
      toast: (value: { message: string }) => toasts.push(value.message),
    },
    client: {
      session: {
        create: async (input: { directory: string }) => {
          created.push(input.directory)

          return { data: { id: `created-${created.length}` } }
        },
      },
    },
    keymap: {
      registerLayer(layer: unknown) {
        layers.push(layer)

        return () => {}
      },
    },
  } as unknown as TuiPluginApi
  const preferences = {
    ready: () => true,
    load: async () => {},
    startInChatForScope: allowed,
  } as unknown as PreferencesController

  return {
    api,
    preferences,
    created,
    navigated,
    toasts,
    layers,
    setAllowed(value: boolean) {
      setAllowed(value)
    },
    setRoute(value: typeof route) {
      route = value
    },
    setDirectory(value: string) {
      directory = value
    },
    setDialog(value: boolean) {
      open = value
    },
  }
}

test('opt-in startup opens one empty chat, but never replaces an existing session or explicit Home', async () => {
  const home = setup('home', true)
  const startup = createStartupSessionController(home.api, home.preferences)

  await startup.initialize()
  await Bun.sleep(0)
  expect(home.created).toEqual(['/workspace'])
  expect(home.navigated).toEqual(['created-1'])

  home.setRoute({ name: 'home' })
  await startup.initialize()
  expect(home.created).toHaveLength(1)

  const existing = setup('session', true)

  await createStartupSessionController(existing.api, existing.preferences).initialize()
  expect(existing.created).toEqual([])

  const disabled = setup('home')

  await createStartupSessionController(disabled.api, disabled.preferences).initialize()
  await Bun.sleep(0)
  expect(disabled.created).toEqual([])
})

test('New session command opens chat only when enabled; modal onboarding leaves Home available', async () => {
  const host = setup('session')
  const view = await testRender(
    () => (
      <StartupSessionBinding api={host.api} controller={createStartupSessionController(host.api, host.preferences)} />
    ),
    { width: 10, height: 2 },
  )

  try {
    await view.renderOnce()
    expect(host.layers).toHaveLength(0)
    host.setAllowed(true)
    await view.flush()
    const command = (host.layers[0] as { commands: { enabled: () => boolean; run: () => void }[] }).commands[0]

    expect(command.enabled()).toBe(true)
    command.run()
    await Bun.sleep(0)
    expect(host.navigated).toEqual(['created-1'])

    host.setRoute({ name: 'home' })
    host.setDialog(true)
    expect(command.enabled()).toBe(false)
    host.setDialog(false)
    host.setAllowed(false)
    expect(command.enabled()).toBe(false)
  } finally {
    view.renderer.destroy()
  }
})

test('OpenCode 1 observes the host New session binding but ignores explicit Home navigation', async () => {
  const host = setup('session', true)
  let dispatched!: (event: { phase: string; command?: string }) => void

  host.api.keymap.on = ((_name: string, handler: typeof dispatched) => {
    dispatched = handler

    return () => {}
  }) as TuiPluginApi['keymap']['on']
  const view = await testRender(
    () => (
      <StartupSessionBinding api={host.api} controller={createStartupSessionController(host.api, host.preferences)} />
    ),
    { width: 10, height: 2 },
  )

  try {
    await view.renderOnce()
    host.setRoute({ name: 'home' })
    expect(host.created).toEqual([])

    dispatched({ phase: 'binding-execute', command: 'session.new' })
    await Bun.sleep(0)
    expect(host.navigated).toEqual(['created-1'])
  } finally {
    view.renderer.destroy()
  }
})

test('in-flight creation is single-shot and does not navigate after the route or workspace changes', async () => {
  const host = setup('session', true)
  const controller = createStartupSessionController(host.api, host.preferences)
  let finish!: (result: { data: { id: string } }) => void
  const calls: string[] = []

  host.api.client.session.create = (async (input: { directory: string }) => {
    calls.push(input.directory)

    return new Promise<{ data: { id: string } }>((resolve) => {
      finish = resolve
    })
  }) as TuiPluginApi['client']['session']['create']

  const first = controller.start()

  await controller.start()
  expect(calls).toEqual(['/workspace'])
  host.setRoute({ name: 'home' })
  host.setDirectory('/elsewhere')
  finish({ data: { id: 'stale' } })
  await first
  expect(host.navigated).toEqual([])
})

test('failed creation reports the error without navigating away from Home', async () => {
  const host = setup('home', true)
  const controller = createStartupSessionController(host.api, host.preferences)

  host.api.client.session.create = (async () => {
    throw new Error('Session storage unavailable')
  }) as TuiPluginApi['client']['session']['create']

  await controller.start()
  expect(host.navigated).toEqual([])
  expect(host.toasts).toEqual(['Session storage unavailable'])
})

test('startup waits for onboarding or upgrade notes to close before opening chat', async () => {
  const host = setup('home', true)

  host.setDialog(true)
  const controller = createStartupSessionController(host.api, host.preferences)

  await controller.initialize()
  await Bun.sleep(0)
  expect(host.created).toEqual([])
  host.setDialog(false)
  await Bun.sleep(250)
  expect(host.navigated).toEqual(['created-1'])
  controller.dispose()
})
