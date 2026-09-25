import { expect, test } from 'bun:test'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('the built plugin registers its lifecycle and sidebar slots', async () => {
  // @ts-expect-error The package intentionally publishes JavaScript without declarations.
  const { default: plugin } = await import('../dist/tui.js')
  const disposers: (() => void | Promise<void>)[] = []
  const subscriptions: string[] = []
  const rendererSubscriptions: string[] = []
  const registrations: { order: number; slots: Record<string, unknown> }[] = []
  const originalFetch = globalThis.fetch

  globalThis.fetch = Object.assign(() => Promise.resolve(Response.json({ version: '0.15.0' })), {
    preconnect() {},
  })
  const api = {
    state: { path: { state: '/tmp/opencode-pretty-sidebar-test' } },
    event: {
      on(name: string) {
        subscriptions.push(name)

        return () => {}
      },
    },
    lifecycle: {
      onDispose(dispose: () => void | Promise<void>) {
        disposers.push(dispose)
      },
    },
    renderer: {
      currentFocusedRenderable: null,
      on(name: string) {
        rendererSubscriptions.push(name)
      },
      off() {},
    },
    slots: {
      register(value: (typeof registrations)[number]) {
        registrations.push(value)
      },
    },
  } as unknown as TuiPluginApi

  try {
    await plugin.tui(api, {})

    expect(subscriptions).toEqual([
      'todo.updated',
      'session.created',
      'session.updated',
      'session.deleted',
      'session.status',
      'session.error',
      'session.idle',
      'server.connected',
      'server.connected',
      'mcp.tools.changed',
      'server.connected',
      'installation.update-available',
    ])
    expect(rendererSubscriptions).toEqual(['focused_renderable'])
    expect(registrations.map((registration) => registration.order)).toEqual([100, 90])
    expect(registrations.map((registration) => Object.keys(registration.slots))).toEqual([
      ['app', 'sidebar_title', 'sidebar_content'],
      ['sidebar_footer'],
    ])
    expect(disposers.length).toBeGreaterThan(0)
  } finally {
    globalThis.fetch = originalFetch
  }
})
