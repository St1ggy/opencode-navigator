import { createSignal } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'

import metadata from '../../package.json'
import { createOpenCodeV2Api } from '../../src/app/opencode-v2'

import type { Plugin } from '@opencode/plugin/tui'

export function nativeHostFixture() {
  const [route, setRoute] = createSignal({ type: 'session', sessionID: 'parent' })
  const [state, setState] = createStore({
    skills: [
      { id: 'skill-a', name: 'review', path: '/synthetic/a', content: 'A' },
      { id: 'skill-b', name: 'review', path: '/synthetic/b', content: 'B' },
    ],
    servers: [{ name: 'docs', status: { status: 'connected' as string } }],
    sessions: [
      {
        id: 'parent',
        projectID: 'project',
        title: 'Parent',
        location: { directory: '/synthetic' },
        time: { created: 1, updated: 2 },
        cost: 0,
      },
      {
        id: 'child',
        parentID: 'parent',
        projectID: 'project',
        title: 'Child',
        location: { directory: '/synthetic' },
        time: { created: 1, updated: 2 },
        cost: 0,
      },
    ],
    running: true,
  })
  const calls: unknown[][] = []
  const handlers = new Map<string, Set<(event: any) => void>>()
  const collection = (name: 'skills' | 'servers') => ({
    list: () => state[name],
    sync: async () => {
      calls.push(['sync', name])
    },
    invalidate: () => calls.push(['invalidate', name]),
  })
  const context = {
    options: {},
    location: { directory: '/synthetic' },
    app: { version: metadata.devDependencies['@opencode/plugin'], channel: 'stable' },
    renderer: { keyInput: { on() {}, off() {} }, currentFocusedRenderable: null },
    data: {
      on: (name: string, handler: (event: any) => void) => {
        const set = handlers.get(name) ?? new Set()

        set.add(handler)
        handlers.set(name, set)

        return () => set.delete(handler)
      },
      session: {
        list: () => state.sessions,
        get: (id: string) => state.sessions.find((item) => item.id === id),
        status: () => (state.running ? 'running' : 'idle'),
        sync: async (id: string) => {
          calls.push(['sync-session', id])
        },
        message: { list: () => [] },
      },
      location: {
        default: () => ({ directory: '/synthetic' }),
        skill: collection('skills'),
        mcp: { server: collection('servers') },
      },
    },
    client: {
      session: {
        skill: async (input: unknown) => {
          calls.push(['skill', input])
        },
        list: async () => ({ data: state.sessions.filter((s) => s.parentID === 'parent'), cursor: {} }),
      },
      mcp: {
        connect: async (input: unknown) => {
          calls.push(['connect', input])
        },
        disconnect: async () => {},
      },
    },
    keymap: {
      commands: () => [],
      shortcuts: () => [],
      dispatch() {},
      layer() {},
      mode: { current: () => 'base', push: () => () => {} },
    },
    ui: { router: { current: route, navigate() {} }, slot: () => () => {}, dialog: {}, toast: { show() {} } },
    theme: {},
    themeMode: 'dark',
  } as unknown as Plugin.Context
  const adapter = createOpenCodeV2Api(context)

  return {
    context,
    api: adapter.api,
    calls,
    state,
    setState,
    setRoute,
    dispose: adapter.dispose,
    setSkills: (skills: typeof state.skills) => setState('skills', reconcile(skills)),
    emit(name: string, data: unknown, location?: { directory: string }) {
      const listeners = handlers.get(name) ?? []

      for (const handler of listeners) handler({ type: name, data, created: 10, ...(location && { location }) })
    },
  }
}
