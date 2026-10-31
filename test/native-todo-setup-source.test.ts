import { expect, test } from 'bun:test'

import { createOpenCodeV2TodoSetup } from '../src/app/opencode-v2/native-todo-setup'
import { createTodoSetupSource } from '../src/app/opencode-v2/todo-setup-source'

import type { PreferencesController } from '../src/entities/preferences'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('native Todo config operations use the connected server and explicit directory, never local client files', async () => {
  const calls: unknown[] = []
  const signal = new AbortController().signal
  const context = {
    client: {
      config: {
        get: async (input: unknown) => {
          calls.push(input)

          return [
            {
              type: 'document',
              path: '/remote/opencode.jsonc',
              info: { experimental: { todo: false, schedules: true }, unrelatedSecret: 'not exposed' },
            },
            { type: 'directory', path: '/remote' },
          ]
        },
      },
      file: {
        read: async (input: unknown) => {
          calls.push(input)

          return new TextEncoder().encode('\u{FEFF}{}')
        },
      },
      experimental: {
        file: {
          write: async (input: unknown) => {
            calls.push(input)
          },
        },
      },
    },
    data: { on: () => () => {} },
  } as unknown as Plugin.Context
  const source = createTodoSetupSource(context)
  const target = { key: 'remote', sessionID: 'session', routing: { directory: '/remote/project' } }

  expect(await source.entries(target, signal)).toEqual([
    { path: '/remote/opencode.jsonc', experimental: { todo: false } },
  ])
  expect(await source.read(target, '/remote/opencode.jsonc', signal)).toBe('\u{FEFF}{}')
  await source.write(target, '/remote/opencode.jsonc', '{"experimental":{"todo":true}}', signal)
  expect(calls).toEqual([
    { location: { directory: '/remote/project' } },
    { location: { directory: '/remote' }, path: 'opencode.jsonc' },
    {
      location: { directory: '/remote' },
      path: 'opencode.jsonc',
      payload: new TextEncoder().encode('{"experimental":{"todo":true}}'),
    },
  ])
})

test('the native Todo palette action uses a global native layer so it remains reachable in the host palette modal', () => {
  let layer: ReturnType<Parameters<Plugin.Context['keymap']['layer']>[0]> | undefined
  const lifecycle = new AbortController()
  const api = {
    route: { current: { name: 'session', params: { sessionID: 'session' } } },
    lifecycle: { signal: lifecycle.signal },
  } as unknown as TuiPluginApi
  const context = {
    data: { on: () => () => {} },
    keymap: {
      layer(factory: () => typeof layer) {
        layer = factory()
      },
    },
  } as unknown as Plugin.Context

  try {
    createOpenCodeV2TodoSetup(context, api, {} as PreferencesController, (sessionID) => ({
      key: sessionID,
      sessionID,
      routing: { directory: '/synthetic' },
    }))
    expect(layer?.mode).toBe('global')
    expect(layer?.commands?.[0].palette).toBe(true)
    expect(layer?.commands?.[0].id).toBe('opencode-navigator.todo.enable')
  } finally {
    lifecycle.abort()
  }
})

test('remote Windows configuration paths use server path semantics independently of the client OS', async () => {
  const calls: unknown[] = []
  const context = {
    client: {
      file: {
        read: async (input: unknown) => {
          calls.push(input)

          return new Uint8Array()
        },
      },
    },
  } as unknown as Plugin.Context
  const source = createTodoSetupSource(context)

  await source.read(
    { key: 'remote', sessionID: 'session', routing: { directory: String.raw`C:\project` } },
    String.raw`C:\settings\opencode.jsonc`,
    new AbortController().signal,
  )
  expect(calls).toEqual([{ location: { directory: String.raw`C:\settings` }, path: 'opencode.jsonc' }])
})
