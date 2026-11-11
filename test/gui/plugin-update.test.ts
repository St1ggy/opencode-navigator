import { expect, test } from 'bun:test'

import { createMainPluginUpdate } from '../../src/app/gui/adapters/main-plugin-update'

import type { PluginInfo } from '@opencode/client'
import type { MainContext } from '@opencode/plugin/gui/main'

const caller = () => ({ signal: new AbortController().signal })

function fixture(source: PluginInfo['source']) {
  let current = source
  let checks = 0
  const installs: unknown[] = []
  const phases: string[] = []
  const context = {
    id: 'synthetic.navigator',
    signal: new AbortController().signal,
    client: {
      plugin: {
        list: async () => ({
          location: { directory: '/synthetic/config' },
          data: [{ id: 'synthetic.navigator', source: current }],
        }),
        check: async () => {
          checks++

          if (current.type === 'package') current = { ...current, outdated: true }

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
  } as unknown as MainContext

  const service = createMainPluginUpdate(context, () => phases.push(service.state().phase))

  return {
    service,
    phases,
    installs,
    checks: () => checks,
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
