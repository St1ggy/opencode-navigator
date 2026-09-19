import { expect, test } from 'bun:test'

import { createSubagentController } from '../src/controllers/subagents'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Session, SessionStatus } from '@opencode-ai/sdk/v2'

function session(id: string, parentID: string, created: number): Session {
  return {
    id,
    slug: id,
    projectID: 'project-1',
    directory: '/repo',
    parentID,
    title: `${id} task`,
    version: '1.18.30',
    time: { created, updated: created },
  }
}

function historyHarness(child: Session = session('child', 'parent', 0)) {
  const handlers = new Map<string, (event: any) => void>()
  const disposers: (() => void)[] = []
  let now = 100
  let snapshot: Record<string, SessionStatus> = { [child.id]: { type: 'busy' } }
  let requests = 0
  const lifecycle = new AbortController()
  const api = {
    state: {
      path: { directory: '/repo' },
      session: { get: () => ({ directory: '/repo' }), status: () => ({ type: 'busy' }) },
    },
    client: {
      session: {
        children: async () => {
          requests++

          return { data: [child] }
        },
        status: async () => ({ data: snapshot }),
      },
    },
    event: {
      on: (type: string, handler: (event: any) => void) => {
        handlers.set(type, handler)

        return () => handlers.delete(type)
      },
    },
    lifecycle: { signal: lifecycle.signal, onDispose: (function_: () => void) => disposers.push(function_) },
    route: { navigate() {} },
  } as unknown as TuiPluginApi

  return {
    api,
    controller: createSubagentController(api, { now: () => now }),
    emit: (type: string, properties: unknown) => handlers.get(type)?.({ properties }),
    setNow: (value: number) => {
      now = value
    },
    setSnapshot: (value: typeof snapshot) => {
      snapshot = value
    },
    requests: () => requests,
    dispose: () => {
      lifecycle.abort()
      for (const function_ of disposers) function_()
    },
  }
}

test('subagent history survives route changes and idle overrides stale host state', async () => {
  const h = historyHarness()

  try {
    const leave = h.controller.activate('parent')

    await h.controller.refresh('parent')
    expect(h.controller.list('parent')[0].run?.startedAt).toBe(100)
    h.setNow(300)
    h.emit('session.error', { sessionID: 'child', error: { name: 'UnknownError', data: { message: 'broken' } } })
    h.emit('session.status', { sessionID: 'child', status: { type: 'idle' } })
    expect(h.controller.list('parent')).toEqual([])
    expect(h.controller.recent('parent')[0].run).toMatchObject({ outcome: 'error', finishedAt: 300 })
    leave()
    h.controller.activate('other')()
    expect(h.controller.recent('parent')).toHaveLength(1)
    h.setSnapshot({})
    await h.controller.refresh('parent')
    expect(h.controller.list('parent')).toEqual([])
    h.emit('session.deleted', { sessionID: 'child' })
    expect(h.controller.recent('parent')).toEqual([])
  } finally {
    h.dispose()
  }
})

test('worker failures and cooldown preserve the last confirmed run until a successful idle snapshot', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  let isFail = false

  globalThis.fetch = (async () => {
    calls++

    if (isFail) return new Response('unavailable', { status: 503 })

    return Response.json(calls === 1 ? { child: { type: 'busy' } } : {})
  }) as unknown as typeof fetch
  const h = historyHarness({
    ...session('child', 'parent', 0),
    metadata: { devTeam: { serverUrl: 'http://127.0.0.1:4100' } },
  })

  try {
    await h.controller.refresh('parent')
    isFail = true
    for (let index = 0; index < 5; index++) await h.controller.refresh('parent')
    expect(calls).toBe(4)
    expect(h.controller.list('parent')[0]).toMatchObject({ unavailable: true, status: { type: 'busy' } })
    expect(h.controller.recent('parent')).toEqual([])
    h.setNow(31_000)
    isFail = false
    await h.controller.refresh('parent')
    expect(h.controller.list('parent')).toEqual([])
    expect(h.controller.recent('parent')).toHaveLength(1)
  } finally {
    globalThis.fetch = originalFetch
    h.dispose()
  }
})

test('polling switches targets once and stops on disposal', async () => {
  const h = historyHarness()

  h.controller.activate('first')
  h.controller.activate('parent')
  await Bun.sleep(1100)
  expect(h.requests()).toBe(1)
  h.dispose()
  await Bun.sleep(1100)
  expect(h.requests()).toBe(1)
})

test('status and error events during refresh win over an older snapshot', async () => {
  const h = historyHarness()

  try {
    await h.controller.refresh('parent')
    let finish!: (value: { data: Record<string, SessionStatus> }) => void
    const client = h.api.client.session as unknown as { status: () => Promise<{ data: Record<string, SessionStatus> }> }

    client.status = () =>
      new Promise((resolve) => {
        finish = resolve
      })
    const refresh = h.controller.refresh('parent')

    h.setNow(200)
    h.emit('session.status', { sessionID: 'child', status: { type: 'idle' } })
    h.setNow(300)
    h.emit('session.status', { sessionID: 'child', status: { type: 'busy' } })
    h.emit('session.error', {
      sessionID: 'child',
      error: { name: 'UnknownError', data: { message: 'new run failed' } },
    })
    finish({ data: {} })
    await refresh
    expect(h.controller.list('parent')[0].run).toMatchObject({ startedAt: 300, outcome: 'error' })
    expect(h.controller.recent('parent')).toEqual([])
  } finally {
    h.dispose()
  }
})

test('an old target response cannot create history after activation changes', async () => {
  const h = historyHarness()

  try {
    h.controller.activate('parent')
    await h.controller.refresh('parent')
    const client = h.api.client.session as unknown as { status: () => Promise<{ data: Record<string, SessionStatus> }> }
    let finish!: (value: { data: Record<string, SessionStatus> }) => void

    client.status = () =>
      new Promise((resolve) => {
        finish = resolve
      })
    const refresh = h.controller.refresh('parent')

    h.controller.activate('other')
    finish({ data: {} })
    await refresh
    expect(h.controller.recent('parent')).toEqual([])
    expect(h.controller.list('parent')[0].run?.startedAt).toBe(100)
  } finally {
    h.dispose()
  }
})

test('keeps active subagent events received during refresh and opens a child session', async () => {
  let resolveChildren!: (value: { data: Session[] }) => void
  let resolveStatuses!: (value: { data: Record<string, SessionStatus> }) => void
  const childrenRequest = new Promise<{ data: Session[] }>((resolve) => {
    resolveChildren = resolve
  })
  const statusRequest = new Promise<{ data: Record<string, SessionStatus> }>((resolve) => {
    resolveStatuses = resolve
  })
  const handlers = new Map<string, (event: any) => void>()
  const navigations: { name: string; params?: Record<string, unknown> }[] = []

  const api = {
    state: {
      path: { directory: '/repo' },
      session: {
        get: () => ({ directory: '/repo' }),
        status: () => {},
      },
    },
    client: {
      session: {
        children: () => childrenRequest,
        status: () => statusRequest,
      },
    },
    event: {
      on: (type: string, handler: (event: any) => void) => {
        handlers.set(type, handler)

        return () => handlers.delete(type)
      },
    },
    lifecycle: { signal: new AbortController().signal, onDispose: () => () => {} },
    route: {
      navigate: (name: string, params?: Record<string, unknown>) => navigations.push({ name, params }),
    },
  } as unknown as TuiPluginApi

  const controller = createSubagentController(api)
  const refreshing = controller.refresh('parent-1')
  const recent = session('recent', 'parent-1', 2)

  handlers.get('session.created')?.({ properties: { sessionID: recent.id, info: recent } })
  handlers.get('session.status')?.({
    properties: { sessionID: recent.id, status: { type: 'retry', attempt: 1, message: 'retrying', next: 0 } },
  })

  const existing = session('existing', 'parent-1', 1)

  resolveChildren({ data: [existing] })
  resolveStatuses({ data: { existing: { type: 'busy' } } })
  await refreshing

  expect(controller.list('parent-1').map((item) => [item.session.id, item.status.type])).toEqual([
    ['existing', 'busy'],
    ['recent', 'retry'],
  ])

  handlers.get('session.status')?.({ properties: { sessionID: recent.id, status: { type: 'idle' } } })
  expect(controller.list('parent-1').map((item) => item.session.id)).toEqual(['existing'])

  controller.open(existing.id)
  expect(navigations).toEqual([{ name: 'session', params: { sessionID: 'existing' } }])
})

test('keeps statuses owned by each parent workspace', async () => {
  const childA = session('child-a', 'parent-a', 1)
  const childB = session('child-b', 'parent-b', 1)
  const api = {
    state: {
      path: { directory: '/repo' },
      session: {
        get: (parentID: string) => ({ directory: `/repo/${parentID}`, workspaceID: `workspace-${parentID}` }),
        status: () => {},
      },
    },
    client: {
      session: {
        children: ({ sessionID }: { sessionID: string }) =>
          Promise.resolve({ data: sessionID === 'parent-a' ? [childA] : [childB] }),
        status: ({ workspace }: { workspace?: string }) =>
          Promise.resolve({
            data:
              workspace === 'workspace-parent-a'
                ? { 'child-a': { type: 'busy' as const } }
                : { 'child-b': { type: 'busy' as const } },
          }),
      },
    },
    event: { on: () => () => {} },
    lifecycle: { signal: new AbortController().signal, onDispose: () => () => {} },
    route: { navigate: () => {} },
  } as unknown as TuiPluginApi
  const controller = createSubagentController(api)

  await controller.refresh('parent-a')
  await controller.refresh('parent-b')

  expect(controller.list('parent-a').map((item) => item.session.id)).toEqual(['child-a'])
  expect(controller.list('parent-b').map((item) => item.session.id)).toEqual(['child-b'])
})

test('reads active dev-team child status from its worker server', async () => {
  const child = {
    ...session('worker', 'parent', 1),
    directory: '/worktrees/worker',
    metadata: { devTeam: { serverUrl: 'http://127.0.0.1:4100' } },
  }
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))

    expect(url.origin).toBe('http://127.0.0.1:4100')
    expect(url.pathname).toBe('/session/status')
    expect(url.searchParams.get('directory')).toBe(child.directory)
    expect(init?.redirect).toBe('error')

    return Response.json({ worker: { type: 'busy' } })
  }) as unknown as typeof fetch
  const api = {
    state: {
      path: { directory: '/repo' },
      session: { get: () => ({ directory: '/repo' }), status: () => {} },
    },
    client: {
      session: {
        children: () => Promise.resolve({ data: [child] }),
        status: () => Promise.resolve({ data: {} }),
      },
    },
    event: { on: () => () => {} },
    lifecycle: { signal: new AbortController().signal, onDispose: () => () => {} },
    route: { navigate: () => {} },
  } as unknown as TuiPluginApi

  try {
    const controller = createSubagentController(api)

    await controller.refresh('parent')
    expect(controller.list('parent').map((item) => [item.session.id, item.status.type])).toEqual([['worker', 'busy']])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('does not restore a dev-team child deleted while its remote status is loading', async () => {
  const child = {
    ...session('worker', 'parent', 1),
    metadata: { devTeam: { serverUrl: 'http://127.0.0.1:4100' } },
  }
  let resolveFetch!: (response: Response) => void
  let markFetchStarted!: () => void
  const fetchStarted = new Promise<void>((resolve) => {
    markFetchStarted = resolve
  })
  const originalFetch = globalThis.fetch

  globalThis.fetch = (() => {
    markFetchStarted()

    return new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
  }) as unknown as typeof fetch
  const handlers = new Map<string, (event: any) => void>()
  const api = {
    state: {
      path: { directory: '/repo' },
      session: { get: () => ({ directory: '/repo' }), status: () => {} },
    },
    client: {
      session: {
        children: () => Promise.resolve({ data: [child] }),
        status: () => Promise.resolve({ data: {} }),
      },
    },
    event: {
      on: (type: string, handler: (event: any) => void) => {
        handlers.set(type, handler)

        return () => handlers.delete(type)
      },
    },
    lifecycle: { signal: new AbortController().signal, onDispose: () => () => {} },
    route: { navigate: () => {} },
  } as unknown as TuiPluginApi

  try {
    const controller = createSubagentController(api)
    const refreshing = controller.refresh('parent')

    await fetchStarted
    handlers.get('session.deleted')?.({ properties: { sessionID: child.id } })
    resolveFetch(Response.json({ worker: { type: 'busy' } }))
    await refreshing
    expect(controller.list('parent')).toEqual([])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('does not request non-loopback dev-team server URLs', async () => {
  const child = {
    ...session('worker', 'parent', 1),
    metadata: { devTeam: { serverUrl: 'https://example.com' } },
  }
  const originalFetch = globalThis.fetch
  let isFetched = false

  globalThis.fetch = (async () => {
    isFetched = true

    return Response.json({})
  }) as unknown as typeof fetch
  const api = {
    state: {
      path: { directory: '/repo' },
      session: { get: () => ({ directory: '/repo' }), status: () => {} },
    },
    client: {
      session: {
        children: () => Promise.resolve({ data: [child] }),
        status: () => Promise.resolve({ data: {} }),
      },
    },
    event: { on: () => () => {} },
    lifecycle: { signal: new AbortController().signal, onDispose: () => () => {} },
    route: { navigate: () => {} },
  } as unknown as TuiPluginApi

  try {
    const controller = createSubagentController(api)

    await controller.refresh('parent')
    expect(isFetched).toBe(false)
  } finally {
    globalThis.fetch = originalFetch
  }
})
