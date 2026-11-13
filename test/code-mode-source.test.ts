import { expect, test } from 'bun:test'

import { createNativeCodeModeSource } from '../src/app/native/code-mode-source'

test('selected-server source uses public snapshots/events and never polls on tool progress or foreign events', async () => {
  const calls: string[] = []
  const events: string[] = []
  let listener: (event: { details: any }) => void = () => {}
  const target = { key: 'server:session:directory', sessionID: 'session', directory: '/synthetic/project' }
  const client = {
    config: {
      get: async () => {
        calls.push('config')

        return [
          {
            type: 'document',
            path: '/synthetic/config.json',
            info: { mcp: { servers: { exact: { type: 'local', command: ['synthetic'], codemode: false } } } },
          },
        ]
      },
    },
    file: {
      read: async () => {
        calls.push('read')

        return new TextEncoder().encode('synthetic')
      },
    },
    experimental: {
      file: {
        write: async () => {
          calls.push('write')
        },
      },
    },
  }
  const data = {
    session: {
      get: () => {},
      sync: async () => {
        calls.push('session')
      },
      message: {
        list: () => [],
        sync: async () => {
          calls.push('messages')
        },
      },
    },
    listen: (handler: typeof listener) => {
      listener = handler

      return () => {
        calls.push('unsubscribe')
      }
    },
  }
  let connected = true
  const source = createNativeCodeModeSource(target, () => {
    if (!connected) throw new Error('Selected connection is gone')

    return { client, data, current: () => connected } as any
  })
  const unsubscribe = source.subscribe((kind) => events.push(kind))
  const signal = new AbortController().signal

  await source.refresh(signal)
  expect(calls).toEqual(['session', 'messages'])
  listener({
    details: {
      type: 'session.tool.progress',
      location: { directory: target.directory },
      data: { sessionID: target.sessionID },
    },
  })
  listener({
    details: {
      type: 'session.tool.progress',
      location: { directory: target.directory },
      data: { sessionID: 'foreign' },
    },
  })
  listener({ details: { type: 'config.updated', location: { directory: '/foreign' } } })
  expect(events).toEqual(['activity'])
  expect(calls).toEqual(['session', 'messages'])
  expect((await source.entries(signal))[0]).toMatchObject({
    path: '/synthetic/config.json',
    servers: { exact: { codemode: false } },
  })
  connected = false
  expect(source.current()).toBe(false)
  expect(
    await source
      .entries(signal)
      .then(() => false)
      .catch(() => true),
  ).toBe(true)
  expect(calls).not.toContain('write')
  unsubscribe()
  expect(calls).toContain('unsubscribe')
})
