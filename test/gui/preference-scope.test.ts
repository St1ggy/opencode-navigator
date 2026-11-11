import { expect, test } from 'bun:test'

import { guiPreferenceScope } from '../../src/app/gui/adapters/preference-scope'
import { guiPreferenceSession } from '../../src/app/gui/adapters/settings-session'

import type { Context, MountedSession } from '@opencode/plugin/gui'

test('GUI preferences preserve local TUI worktree keys and isolate identical remote paths', () => {
  const session = {
    id: 'session',
    directory: '/synthetic/project/subdir',
    location: { directory: '/synthetic/project/subdir' },
    visit: {},
    project: { worktree: '/synthetic/project' },
    server: { id: 'sidecar', local: true },
  }
  const resolve = () => guiPreferenceScope(session as unknown as MountedSession)

  expect(resolve()).toBe('/synthetic/project/subdir')
  session.server.local = false
  session.server.id = 'remote-a'
  const first = resolve()

  session.server.id = 'remote-b'
  expect(resolve()).not.toBe(first)
  expect(JSON.parse(first)).toEqual(['remote-a', '/synthetic/project/subdir'])
  session.server.id = 'https://user:secret@example.invalid'
  expect(resolve()).toBe('global')
  expect(guiPreferenceScope(undefined)).toBe('global')
})

test('native Settings reads scope only from the public active tab and never retains it on Home', () => {
  let route = '/settings?tab=synthetic.settings'
  let active = true
  const session = {
    id: 'session',
    pending: false,
    location: { directory: '/synthetic/project' },
    server: { id: 'sidecar', local: true },
  }
  const context = {
    sessions: { current: () => {} },
    router: { path: () => route },
    tabs: {
      list: () => [{ key: 'synthetic-tab', active, session }],
    },
  } as unknown as Context

  expect(guiPreferenceScope(guiPreferenceSession(context))).toBe('/synthetic/project')
  active = false
  expect(guiPreferenceSession(context)).toBeUndefined()
  active = true
  route = '/'
  expect(guiPreferenceSession(context)).toBeUndefined()
  session.server.id = 'remote'
  session.server.local = false
  route = '/settings'
  expect(JSON.parse(guiPreferenceScope(guiPreferenceSession(context)))).toEqual(['remote', '/synthetic/project'])
})
