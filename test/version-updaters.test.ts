import { expect, test } from 'bun:test'

import { createOpenCodeV1VersionUpdater, createOpenCodeV2VersionUpdater } from '../src/app/version-updaters'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi, TuiPluginMeta } from '@opencode-ai/plugin/tui'

test('OpenCode 1 updates through the current executable and preserves the global plugin scope', async () => {
  const commands: (readonly string[])[] = []
  const installs: { spec: string; global?: boolean }[] = []
  const api = {
    state: { path: { config: '/workspace/.opencode/tui.json', worktree: '/workspace' } },
    plugins: {
      install: async (spec: string, options: { global?: boolean }) => {
        installs.push({ spec, ...options })

        return { ok: true as const, dir: '/plugins', tui: true }
      },
    },
  } as unknown as TuiPluginApi
  const meta = { source: 'npm', spec: 'opencode-navigator' } as TuiPluginMeta
  const updater = createOpenCodeV1VersionUpdater(
    api,
    meta,
    async (command) => {
      commands.push(command)
    },
    async (path) => (path.includes('/.config/opencode/') ? { plugin: ['opencode-navigator'] } : undefined),
  )

  await updater.openCode('1.19.0')
  await updater.navigator('0.16.0')

  expect(commands).toEqual([[process.execPath, 'upgrade', '1.19.0']])
  expect(installs).toEqual([{ spec: 'opencode-navigator@0.16.0', global: true }])

  const projectUpdater = createOpenCodeV1VersionUpdater(
    api,
    meta,
    async () => {},
    async (path) => (path.startsWith('/workspace/') ? { plugin: ['opencode-navigator'] } : undefined),
  )

  await projectUpdater.navigator('0.17.0')
  expect(installs.at(-1)).toEqual({ spec: 'opencode-navigator@0.17.0', global: false })

  const localUpdater = createOpenCodeV1VersionUpdater(api, { ...meta, source: 'file' }, async () => {})

  await expect(localUpdater.navigator('0.17.0')).rejects.toThrow('Local Navigator installations')
})

test('OpenCode 2 updates the current package target and rejects local Navigator sources', async () => {
  const updates: unknown[] = []
  let source: 'package' | 'local' = 'package'
  const context = {
    location: '/workspace',
    client: {
      plugin: {
        list: async () => ({
          data: [
            {
              id: 'opencode-navigator',
              source:
                source === 'package'
                  ? { type: 'package', target: 'opencode-navigator', version: '0.15.0', path: '/plugins' }
                  : { type: 'local', path: '/workspace/plugin.ts' },
            },
          ],
          location: '/workspace',
        }),
        update: async (input: unknown) => {
          updates.push(input)
        },
      },
    },
  } as unknown as Plugin.Context
  const updater = createOpenCodeV2VersionUpdater(context)

  await updater.navigator('0.16.0')
  expect(updates).toEqual([{ location: '/workspace', targets: ['opencode-navigator'] }])

  source = 'local'
  await expect(updater.navigator('0.16.0')).rejects.toThrow('Local Navigator installations')
})
