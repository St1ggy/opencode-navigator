import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

import { createOpenCodeV1VersionUpdater, createOpenCodeV2VersionUpdater } from '../src/app/version-updaters'

import type * as NavigatorUpdates from '../src/navigator-updates'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi, TuiPluginMeta } from '@opencode-ai/plugin/tui'

test('OpenCode 1 updates through the current executable and preserves the global plugin scope', async () => {
  const hostTarget = '2.1.0'
  const packageTarget = '1.2.4'
  const projectTarget = '1.3.0'
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

  await updater.openCode(hostTarget)
  await updater.navigator(packageTarget)

  expect(commands).toEqual([[process.execPath, 'upgrade', hostTarget]])
  expect(installs).toEqual([{ spec: `opencode-navigator@${packageTarget}`, global: true }])

  const projectUpdater = createOpenCodeV1VersionUpdater(
    api,
    meta,
    async () => {},
    async (path) => (path.startsWith('/workspace/') ? { plugin: ['opencode-navigator'] } : undefined),
  )

  await projectUpdater.navigator(projectTarget)
  expect(installs.at(-1)).toEqual({ spec: `opencode-navigator@${projectTarget}`, global: false })

  const localUpdater = createOpenCodeV1VersionUpdater(api, { ...meta, source: 'file' }, async () => {})

  await expect(localUpdater.navigator(projectTarget)).rejects.toThrow('Unrecognized local Navigator source')
})

test('OpenCode 1 advances a recognized pinned local wrapper without changing its config source', async () => {
  const target = '1.2.4'
  const commands: (readonly string[])[] = []
  const api = {} as TuiPluginApi
  const meta = {
    source: 'file',
    spec: 'file:///snapshots/opencode-navigator/tui.js',
  } as TuiPluginMeta
  const updater = createOpenCodeV1VersionUpdater(api, meta, async (command) => {
    commands.push(command)
  })

  await updater.navigator(target)
  expect(commands).toHaveLength(1)
  expect(commands[0][0]).toBe('node')
  expect(commands[0][1].endsWith('/scripts/update-local-snapshot.mjs')).toBe(true)
  expect(commands[0].slice(2)).toEqual(['/snapshots/opencode-navigator/tui.js', target])
})

test('OpenCode 2 updates the current package target and rejects local Navigator sources', async () => {
  const target = '1.2.4'
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
                  ? { type: 'package', target: 'opencode-navigator', version: '1.2.3', path: '/plugins' }
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

  await updater.navigator(target)
  expect(updates).toEqual([{ location: '/workspace', targets: ['opencode-navigator'] }])

  source = 'local'
  await expect(updater.navigator(target)).rejects.toThrow('Unrecognized local Navigator source')
})

test('OpenCode 2 keeps an absolute directory package source when updating a pinned snapshot', async () => {
  const target = '1.2.4'
  const calls: (readonly string[])[] = []
  const context = {
    location: { directory: '/workspace' },
    client: {
      plugin: {
        list: async () => ({
          location: { directory: '/workspace' },
          data: [{ id: 'opencode-navigator', source: { type: 'package', target: '/snapshots/opencode-navigator' } }],
        }),
        update: async () => {
          throw new Error('Host package updater must not run for a pinned local source')
        },
      },
    },
  } as unknown as Plugin.Context
  const updater = createOpenCodeV2VersionUpdater(context, async (command) => {
    calls.push(command)
  })

  await updater.navigator(target)
  expect(calls[0].slice(2)).toEqual(['/snapshots/opencode-navigator/tui.js', target])
})

test('the packaged update chunk resolves the shipped pinned-snapshot installer for both hosts', async () => {
  const updates = (await import(
    new URL('../dist/navigator-updates.js', import.meta.url).href
  )) as typeof NavigatorUpdates
  const calls: (readonly string[])[] = []
  const execute = async (command: readonly string[]) => {
    calls.push(command)
  }
  const wrapper = '/snapshots/opencode-navigator/tui.js'
  const target = '1.2.4'
  const v1 = updates.createOpenCodeV1VersionUpdater(
    {} as TuiPluginApi,
    { source: 'file', spec: wrapper } as TuiPluginMeta,
    execute,
  )
  const v2 = updates.createOpenCodeV2VersionUpdater(
    {
      client: {
        plugin: {
          list: async () => ({ data: [{ id: 'opencode-navigator', source: { type: 'local', path: wrapper } }] }),
        },
      },
    } as unknown as Plugin.Context,
    execute,
  )

  await v1.navigator(target)
  await v2.navigator(target)
  const installer = fileURLToPath(new URL('../scripts/update-local-snapshot.mjs', import.meta.url))

  expect(calls).toEqual([
    ['node', installer, wrapper, target],
    ['node', installer, wrapper, target],
  ])
  expect(await Bun.file(installer).exists()).toBe(true)
})
