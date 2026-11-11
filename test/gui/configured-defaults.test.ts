import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { createGuiConfiguredDefaults } from '../../src/app/gui/configured-defaults'
import { createPreferencesModel, emptyPreferencesDocument } from '../../src/entities/preferences/model'
import { pluginConfig } from '../../src/shared/config'

import type { PreferencesController } from '../../src/entities/preferences/model'
import type { Context, MountedSession } from '@opencode/plugin/gui'

test('configured GUI defaults switch with the selected server without erasing private preferences or accepting late results', async () => {
  const preferences = createPreferencesModel({ notifications: { show() {} }, validKey: () => true }, pluginConfig({}), {
    load: async () => ({
      ...emptyPreferencesDocument(),
      global: { behavior: { limitsRefreshMinutes: 7 } },
      user: { favoriteMcpServers: ['private-favorite'] },
    }),
    update: async () => {},
    flush: async () => {},
  })

  await preferences.load()
  let finish!: (value: string) => void
  const root = createRoot((dispose) => {
    const makeSession = (id: string, delayed = false) => ({
      id: 'session',
      directory: '/synthetic',
      location: { directory: '/synthetic' },
      visit: {},
      server: {
        id,
        local: false,
        connected: true,
        compatible: true,
        data: { on: () => () => {} },
        client: {
          rpc: () => ({
            defaults: async () =>
              delayed
                ? new Promise<string>((resolve) => {
                    finish = resolve
                  })
                : JSON.stringify({
                    defaults: {
                      behavior: { limitsRefreshMinutes: 15 },
                      layoutPresets: { [id]: { sections: { todo: true }, expanded: {} } },
                    },
                    warnings: [],
                  }),
          }),
        },
      },
    })
    const [session, setSession] = createSignal(makeSession('remote-a', true))
    const context = {
      options: {},
      signal: new AbortController().signal,
      sessions: { current: () => session() as unknown as MountedSession },
      toast: { show() {} },
    } as unknown as Context
    const source = createGuiConfiguredDefaults(context, preferences)

    return { dispose, source, switchServer: () => setSession(makeSession('remote-b')) }
  })

  try {
    root.switchServer()
    await root.source.reload()
    expect(Object.keys(preferences.layoutPresets())).toEqual(['remote-b'])
    expect(preferences.limitsRefreshMinutes()).toBe(7)
    finish(
      JSON.stringify({
        defaults: { layoutPresets: { stale: { sections: { skills: false }, expanded: {} } } },
        warnings: [],
      }),
    )
    await Promise.resolve()
    expect(Object.keys(preferences.layoutPresets())).toEqual(['remote-b'])
    expect([...preferences.favoriteMcpServers()]).toEqual(['private-favorite'])
  } finally {
    root.dispose()
  }
})

test('same-target refreshes ignore superseded transport failures but still report current failures', async () => {
  const notifications: string[] = []
  const requests: { resolve(value: string): void; reject(error: Error): void }[] = []
  let refresh!: () => void
  const root = createRoot((dispose) => {
    const session = {
      id: 'session',
      location: { directory: '/synthetic' },
      server: {
        id: 'sidecar',
        connected: true,
        compatible: true,
        data: {
          on: (_type: string, listener: (event: object) => void) => {
            refresh = () => listener({ location: { directory: '/synthetic' } })

            return () => {}
          },
        },
        client: {
          rpc: () => ({
            defaults: () =>
              new Promise<string>((resolve, reject) => {
                requests.push({ resolve, reject })
              }),
          }),
        },
      },
    }
    const context = {
      options: {},
      signal: new AbortController().signal,
      sessions: { current: () => session },
      toast: {
        show: (value: { title: string }) => {
          notifications.push(value.title)
        },
      },
    } as unknown as Context

    createGuiConfiguredDefaults(context, { setConfiguredDefaults() {} } as unknown as PreferencesController)

    return { dispose }
  })

  try {
    expect(requests).toHaveLength(1)
    refresh()
    expect(requests).toHaveLength(2)
    requests[0].reject(new Error('Synthetic superseded transport request'))
    requests[1].resolve(JSON.stringify({ defaults: {}, warnings: [] }))
    await Bun.sleep(0)
    expect(notifications).toEqual([])
    refresh()
    requests[2].reject(new Error('Synthetic current server failure'))
    await Bun.sleep(0)
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toContain('configuration could not be loaded')
  } finally {
    root.dispose()
  }
})
