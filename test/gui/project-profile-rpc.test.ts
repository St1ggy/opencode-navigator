import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { setupProjectProfileServer } from '../../src/features/sidebar-settings/server'

import type { Context } from '@opencode/plugin/promise/plugin'

type Handlers = Record<string, (input: unknown, caller: { signal: AbortSignal }) => Promise<unknown>>
const caller = () => ({ signal: new AbortController().signal })
const portable = JSON.stringify({
  format: 'opencode-navigator/settings',
  version: 1,
  layout: { sections: { todo: true } },
  mcp: { synthetic: 'enabled' },
})

test('profile RPC previews without writing and binds a single save to the original server session and file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'navigator-profile-rpc-'))
  let handlers!: Handlers
  let directory = root
  const context = {
    location: { directory: root },
    session: { get: async () => ({ location: { directory } }) },
    rpc: {
      register: async (_definition: unknown, value: Handlers) => {
        handlers = value

        return { dispose: async () => {} }
      },
    },
  } as unknown as Context
  const cleanup = await setupProjectProfileServer(context)

  try {
    const preview = (await handlers.preview(
      { sessionID: 'synthetic-session', name: 'Synthetic profile', source: portable },
      caller(),
    )) as { token: string; after: string }
    const file = join(root, '.opencode/navigator.json')

    await expect(readFile(file, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(JSON.parse(preview.after).workspaceProfiles).toEqual({ 'Synthetic profile': 'Synthetic profile' })
    await expect(handlers.save({ sessionID: 'another-session', token: preview.token }, caller())).rejects.toThrow(
      'expired',
    )
    directory = '/synthetic/stale'
    await expect(handlers.save({ sessionID: 'synthetic-session', token: preview.token }, caller())).rejects.toThrow(
      'location changed',
    )
    directory = root
    await handlers.save({ sessionID: 'synthetic-session', token: preview.token }, caller())
    expect(await readFile(file, 'utf8')).toBe(preview.after)
    await expect(handlers.save({ sessionID: 'synthetic-session', token: preview.token }, caller())).rejects.toThrow(
      'expired',
    )
    const replacement = (await handlers.preview(
      { sessionID: 'synthetic-session', name: 'Synthetic profile', source: portable, replace: true },
      caller(),
    )) as { token: string }

    await writeFile(file, `${preview.after}\n`)
    await expect(handlers.save({ sessionID: 'synthetic-session', token: replacement.token }, caller())).rejects.toThrow(
      'settings changed',
    )
  } finally {
    await cleanup()
    await rm(root, { recursive: true, force: true })
  }
})

test('profile RPC refuses workspace-placed locations before consulting local filesystem or session data', async () => {
  let handlers!: Handlers
  const context = {
    location: { directory: '/synthetic/virtual', workspaceID: 'synthetic-workspace' },
    session: {
      get: () => {
        throw new Error('Workspace request must not access the host filesystem')
      },
    },
    rpc: {
      register: async (_definition: unknown, value: Handlers) => {
        handlers = value

        return { dispose: async () => {} }
      },
    },
  } as unknown as Context
  const cleanup = await setupProjectProfileServer(context)

  try {
    await expect(
      handlers.preview({ sessionID: 'synthetic', name: 'Profile', source: portable }, caller()),
    ).rejects.toThrow('workspace-placed filesystem')
  } finally {
    await cleanup()
  }
})
