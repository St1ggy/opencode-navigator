import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { advanceCliPin } from '../src/app/cli-pin'
import { advanceServerPin, pluginPinEdit } from '../src/app/plugin-pin'

import type { OpenCodeClient } from '@opencode/client'

const directories: string[] = []
const target = 'opencode-navigator@1.2.3'
const source = `{
  // Preserve the source, options and every unrelated setting.
  "plugin": [{"package":"${target}","options":{"synthetic":true}},"other-plugin"],
  "theme": "synthetic-theme",
}
`

afterEach(async () => {
  await Promise.all(directories.map((path) => rm(path, { recursive: true, force: true })))
  directories.length = 0
})

test('advancing an exact pin changes only its JSONC string, preserving comments, legacy fields and options', () => {
  expect(pluginPinEdit(source, target, '1.2.4')).toBe(source.replace(target, 'opencode-navigator@1.2.4'))
  expect(pluginPinEdit('{"plugins":["different-plugin"]}', target, '1.2.4')).toBeUndefined()
  expect(pluginPinEdit(`{"plugins":[["${target}",{"x":1}]]}`, target, '1.2.4')).toContain('opencode-navigator@1.2.4')
  expect(() => pluginPinEdit(`{"plugin":["${target}","${target}"]}`, target, '1.2.4')).toThrow('ambiguous')
  expect(() => pluginPinEdit(source, target, '1.2.2')).toThrow('Invalid')
})

test('a TUI pin update preserves its cli.json symlink and never rewrites unrelated settings', async () => {
  const root = await mkdtemp(join(tmpdir(), 'navigator-cli-pin-'))

  directories.push(root)
  const file = join(root, 'actual.jsonc')
  const link = join(root, 'cli.json')

  await writeFile(file, source)
  await symlink(file, link)
  expect(await advanceCliPin(target, '1.2.4', link)).toBe(true)
  expect(await realpath(link)).toBe(await realpath(file))
  expect(await readFile(file, 'utf8')).toBe(source.replace(target, 'opencode-navigator@1.2.4'))
  expect(await advanceCliPin(target, '1.2.4', link)).toBe(false)
})

test('a stale CLI target leaves the file and its scope unchanged', async () => {
  const root = await mkdtemp(join(tmpdir(), 'navigator-cli-stale-'))

  directories.push(root)
  const file = join(root, 'cli.json')

  await writeFile(file, source)
  await Promise.resolve(
    expect(advanceCliPin(target, '1.2.4', file, () => false)).rejects.toThrow('configuration changed'),
  )
  expect(await readFile(file, 'utf8')).toBe(source)
})

test.each(['missing', 'ambiguous', 'inactive', 'stale-target', 'late-edit'])(
  'server pin update refuses unsafe ownership or changed targets: %s',
  async (scenario) => {
    let writes = 0
    let reads = 0
    const client = {
      config: {
        get: async () =>
          scenario === 'missing'
            ? []
            : Array.from({ length: scenario === 'ambiguous' ? 2 : 1 }, (_, index) => ({
                type: 'document',
                path: `/synthetic/${index}/opencode.jsonc`,
              })),
      },
      file: {
        read: async () => new TextEncoder().encode(++reads === 3 && scenario === 'late-edit' ? `${source}\n` : source),
      },
      plugin: {
        list: async () => ({ data: scenario === 'inactive' ? [] : [{ source: { type: 'package', target } }] }),
      },
      experimental: {
        file: {
          write: async () => {
            writes++
          },
        },
      },
    } as unknown as OpenCodeClient

    await Promise.resolve(
      expect(
        advanceServerPin(client, {}, target, '1.2.4', new AbortController().signal, () => scenario !== 'stale-target'),
      ).rejects.toThrow(),
    )
    expect(writes).toBe(0)
  },
)

test.each([false, true])(
  'server pin update routes file I/O through its native client and rejects stale files: %s',
  async (stale) => {
    let reads = 0
    const writes: string[] = []
    let content = source
    const client = {
      config: { get: async () => [{ type: 'document', path: '/synthetic/config/opencode.jsonc' }] },
      file: { read: async () => new TextEncoder().encode(++reads > 1 && stale ? `${source}\n` : content) },
      plugin: { list: async () => ({ data: [{ source: { type: 'package', target } }] }) },
      experimental: {
        file: {
          write: async (input: { path: string; payload: Uint8Array }) => {
            expect(input.path).toBe('opencode.jsonc')
            writes.push(new TextDecoder().decode(input.payload))
            content = new TextDecoder().decode(input.payload)
          },
        },
      },
    } as unknown as OpenCodeClient
    const update = advanceServerPin(
      client,
      { location: { directory: '/synthetic/project' } },
      target,
      '1.2.4',
      new AbortController().signal,
    )

    await (stale ? expect(update).rejects.toThrow('configuration changed') : update)

    expect(writes).toEqual(stale ? [] : [source.replace(target, 'opencode-navigator@1.2.4')])
  },
)
