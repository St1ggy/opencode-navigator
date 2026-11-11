import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { createGuiSettingsAccess } from '../../src/app/gui/adapters/settings-access'

import type { Context, MountedSession } from '@opencode/plugin/gui'

test('native Settings retains the real active-tab lease but invalidates Home and changed server connections', () => {
  const root = createRoot((dispose) => {
    const reference = {
      id: 'session',
      tab: 'synthetic-tab',
      pending: false,
      location: { directory: '/synthetic' },
      server: { id: 'sidecar', local: true, connected: true, compatible: true, client: {}, data: {} },
    }
    const visit = {}
    const [mounted, setMounted] = createSignal<MountedSession | undefined>({
      ...reference,
      visit,
      directory: '/synthetic',
    } as unknown as MountedSession)
    const [route, setRoute] = createSignal('/session/synthetic')
    const context = {
      sessions: { current: mounted },
      router: { path: route },
      tabs: {
        list: () => [{ active: route() !== '/settings', key: 'synthetic-tab', session: reference }],
      },
    } as unknown as Context

    return { dispose, access: createGuiSettingsAccess(context), reference, visit, setMounted, setRoute }
  })

  try {
    const scope = root.access.capture()!
    const request = root.access.read(scope)

    expect(scope.visit).toBe(root.visit)
    root.setRoute('/settings')
    root.setMounted(undefined)
    expect(root.access.capture()?.visit).toBe(root.visit)
    expect(root.reference.server.client).toBe(root.access.read(scope).client)
    expect(request.current()).toBe(true)
    root.reference.server.client = {}
    expect(request.current()).toBe(false)
    root.setRoute('/')
    expect(root.access.capture()).toBeUndefined()
    expect(root.access.current(scope)).toBe(false)
  } finally {
    root.dispose()
  }
})
