import { expect, test } from 'bun:test'

import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'
import { createGuiTodoSetupSource } from '../../src/app/gui/adapters/todo-setup-source'
import { serverFileTarget } from '../../src/shared/lib/server-file'

import type { MountedSession } from '@opencode/plugin/gui'

test('server configuration paths preserve the selected server platform and reject unsafe targets', () => {
  expect(serverFileTarget('/config/opencode.jsonc')).toEqual({
    location: { directory: '/config' },
    path: 'opencode.jsonc',
  })
  expect(serverFileTarget(String.raw`C:\config\opencode.json`)).toEqual({
    location: { directory: String.raw`C:\config` },
    path: 'opencode.json',
  })
  expect(serverFileTarget(String.raw`C:\opencode.json`)).toEqual({
    location: { directory: 'C:\\' },
    path: 'opencode.json',
  })
  expect(serverFileTarget(String.raw`\\server\share\opencode.json`)).toEqual({
    location: { directory: String.raw`\\server\share` },
    path: 'opencode.json',
  })
  for (const path of ['relative.json', '/a/../config.json', '/a/./config.json', '/a/', '/a\0.json'])
    expect(() => serverFileTarget(path)).toThrow('unsafe')
})

test('GUI Todo configuration uses the selected remote client and rejects reconnect/stale writes', async () => {
  const writes: unknown[] = []
  let reconnect = false
  const config = '// preserved comment\n{"experimental":{"todo":false}}\n'
  const session = {
    id: 'session',
    directory: '/project',
    location: { directory: '/project' },
    visit: {},
    pending: false,
    server: {
      id: 'remote',
      connected: true,
      compatible: true,
      data: {},
      client: {
        config: {
          get: async () => [
            { type: 'document', path: '/remote/opencode.jsonc', info: { experimental: { todo: false } } },
          ],
        },
        file: {
          read: async () => {
            if (reconnect) session.server.client = { ...session.server.client }

            return new TextEncoder().encode(config)
          },
        },
        experimental: {
          file: {
            write: async (value: unknown) => {
              writes.push(value)
            },
          },
        },
      },
    },
  }
  const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
  const scope = access.capture()!
  const source = createGuiTodoSetupSource(access, scope)
  const target = { key: scope.target.sessionKey, sessionID: 'session', routing: { directory: '/project' } }
  const signal = new AbortController().signal

  expect(await source.entries(target, signal)).toEqual([
    { path: '/remote/opencode.jsonc', experimental: { todo: false } },
  ])
  expect(await source.read(target, '/remote/opencode.jsonc', signal)).toBe(config)
  await source.write(target, '/remote/opencode.jsonc', config, signal)
  expect(writes).toEqual([
    { location: { directory: '/remote' }, path: 'opencode.jsonc', payload: new TextEncoder().encode(config) },
  ])
  reconnect = true
  await expect(source.read(target, '/remote/opencode.jsonc', signal)).rejects.toThrow('connection changed')
  session.visit = {}
  await expect(source.write(target, '/remote/opencode.jsonc', config, signal)).rejects.toThrow(
    'session or server changed',
  )
  expect(writes).toHaveLength(1)
})
