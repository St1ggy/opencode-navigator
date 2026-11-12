import { expect, test } from 'bun:test'

import { createMainPluginUpdate } from '../../src/app/gui/adapters/main-plugin-update'

import type { PluginInfo } from '@opencode/client'
import type { MainContext } from '@opencode/plugin/gui/main'

const caller = () => ({ signal: new AbortController().signal })

function fixture(source: PluginInfo['source'], outdated = true) {
  let current = source
  let checks = 0
  const installs: unknown[] = []
  const phases: string[] = []
  let config = JSON.stringify({
    plugins: [source.type === 'package' ? { package: source.target, options: { synthetic: true } } : 'unrelated'],
  })
  const context = {
    id: 'synthetic.navigator',
    signal: new AbortController().signal,
    client: {
      config: { get: async () => [{ type: 'document', path: '/synthetic/config/opencode.jsonc' }] },
      file: { read: async () => new TextEncoder().encode(config) },
      experimental: {
        file: {
          write: async (value: { payload: Uint8Array }) => {
            config = new TextDecoder().decode(value.payload)
          },
        },
      },
      plugin: {
        list: async () => ({
          location: { directory: '/synthetic/config' },
          data: [{ id: 'synthetic.navigator', source: current }],
        }),
        check: async () => {
          checks++

          if (current.type === 'package' && outdated) current = { ...current, outdated: true }

          return {
            location: { directory: '/synthetic/config' },
            data: [{ id: 'synthetic.navigator', source: current }],
          }
        },
        update: async (input: unknown) => {
          installs.push(input)
        },
      },
    },
  }

  const service = createMainPluginUpdate(
    context as unknown as MainContext,
    () => phases.push(service.state().phase),
    async () => '1.2.4',
  )

  return {
    service,
    context,
    phases,
    installs,
    checks: () => checks,
    config: () => config,
    source: (value: PluginInfo['source']) => {
      current = value
    },
  }
}

test.each([
  { type: 'local', path: '/synthetic/snapshot' },
  { type: 'package', target: '/synthetic/package' },
  { type: 'package', target: 'file:///synthetic/package' },
  { type: 'package', target: 'some-other-package' },
] as const)('GUI update preserves unsupported source $type without replacing it', async (source) => {
  const context = fixture(source)

  expect((await context.service.check(undefined, caller())).status).toBe('unsupported')
  expect(context.checks()).toBe(0)
  await expect(context.service.install({ token: 'forged' }, caller())).rejects.toThrow('expired')
  expect(context.installs).toEqual([])
})

test('GUI native update requires the current source token and preserves configuration scope', async () => {
  const context = fixture({ type: 'package', target: 'opencode-navigator', version: '0.1.0' })
  const preview = await context.service.check(undefined, caller())

  expect(preview.status).toBe('available')
  expect(context.installs).toEqual([])
  await context.service.install({ token: preview.token! }, caller())
  expect(context.installs).toEqual([{ location: { directory: '/synthetic/config' }, targets: ['opencode-navigator'] }])
  expect(context.phases).toEqual(['preparing', 'installing', 'idle'])
  expect(context.service.state().phase).toBe('idle')
  await expect(context.service.install({ token: preview.token! }, caller())).rejects.toThrow('expired')
  const next = await context.service.check(undefined, caller())

  context.source({ type: 'local', path: '/synthetic/replaced' })
  await expect(context.service.install({ token: next.token! }, caller())).rejects.toThrow('installation changed')
  expect(context.installs).toHaveLength(1)
})

test('an exact package pin is not reported current merely because the native updater skips it', async () => {
  const context = fixture({ type: 'package', target: 'opencode-navigator@1.2.3', version: '1.2.3' }, false)
  const checked = await context.service.check(undefined, caller())

  expect(checked.status).toBe('available')
  expect(checked.token).toBeDefined()
  expect(context.installs).toEqual([])
  await context.service.install({ token: checked.token! }, caller())
  expect(context.config()).toContain('opencode-navigator@1.2.4')
  expect(context.config()).toContain('"synthetic":true')
  expect(context.installs).toEqual([])
})

test('a confirmation cannot be reused against a replacement server with the same package source', async () => {
  const fixtureState = fixture({ type: 'package', target: 'opencode-navigator', version: '1.2.3' })
  const checked = await fixtureState.service.check(undefined, caller())

  fixtureState.context.client = { ...fixtureState.context.client }
  await expect(fixtureState.service.install({ token: checked.token! }, caller())).rejects.toThrow(
    'installation changed',
  )
  expect(fixtureState.installs).toEqual([])
})

test('an exact-pin registry failure is an error rather than evidence that Navigator is current', async () => {
  const fixtureState = fixture({ type: 'package', target: 'opencode-navigator@1.2.3', version: '1.2.3' })
  const service = createMainPluginUpdate(fixtureState.context as unknown as MainContext, undefined, async () => {
    throw new Error('Synthetic registry unavailable')
  })

  await expect(service.check(undefined, caller())).rejects.toThrow('registry unavailable')
  await expect(service.install({ token: 'not-confirmed' }, caller())).rejects.toThrow('expired')
  expect(fixtureState.installs).toEqual([])
})
