import { expect, test } from 'bun:test'

import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'

import type { MountedSession } from '@opencode/plugin/gui'

function createFixture() {
  let client = { marker: 'first live client' }
  let data = { marker: 'first live cache' }
  const session = {
    id: 'same-session',
    directory: '/synthetic/project',
    visit: {},
    pending: false,
    location: { directory: '/synthetic/project', workspaceID: 'workspace' },
    server: {
      id: 'server-a',
      password: crypto.randomUUID(),
      connected: true,
      compatible: true,
      get client() {
        return client
      },
      get data() {
        return data
      },
    },
  }
  let selected: typeof session | undefined = session
  const access = createSelectedSessionAccess(() => selected as unknown as MountedSession | undefined)

  return {
    access,
    session,
    home: () => {
      selected = undefined
    },
    reconnect: () => {
      client = { marker: 'reconnected client' }
      data = { marker: 'reconnected cache' }
    },
  }
}

test('GUI selected-session requests read live remote client/cache without retaining credentials', () => {
  const fixture = createFixture()
  const scope = fixture.access.capture()!
  const first = fixture.access.read(scope)

  expect(JSON.stringify(scope)).not.toContain(fixture.session.server.password)
  fixture.reconnect()
  expect(first.current()).toBe(false)
  expect(fixture.access.read(scope).client).not.toBe(first.client)
  expect(fixture.access.read(scope).data).not.toBe(first.data)
  expect(scope.target.serverID).toBe('server-a')
})

test('GUI identical session/location identifiers on another server reject stale access', () => {
  const fixture = createFixture()
  const scope = fixture.access.capture()!

  fixture.session.server.id = 'server-b'
  expect(fixture.access.current(scope)).toBe(false)
  expect(() => fixture.access.read(scope)).toThrow('session or server changed')
})

test('GUI Home, new visits and unresolved locations cannot reuse an old scope', () => {
  const fixture = createFixture()
  const scope = fixture.access.capture()!

  fixture.session.visit = {}
  expect(fixture.access.current(scope)).toBe(false)
  fixture.home()
  expect(fixture.access.capture()).toBeUndefined()
  expect(() => fixture.access.read(scope)).toThrow('session or server changed')
})

test('GUI rejects missing location, embedded URL credentials and offline targets', () => {
  const fixture = createFixture()
  const scope = fixture.access.capture()!

  fixture.session.server.connected = false
  expect(() => fixture.access.read(scope)).toThrow('offline')
  fixture.session.server.connected = true
  fixture.session.location.directory = '/synthetic/other'
  expect(fixture.access.capture()).toBeUndefined()
  fixture.session.location.directory = fixture.session.directory
  fixture.session.server.id = `https://user:${crypto.randomUUID()}@synthetic.invalid`
  expect(fixture.access.capture()).toBeUndefined()
})
