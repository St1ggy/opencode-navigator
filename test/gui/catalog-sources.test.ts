import { expect, test } from 'bun:test'

import { createGuiCatalogSources } from '../../src/app/gui/adapters/catalog-sources'
import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'

import type { MountedSession } from '@opencode/plugin/gui'

function fixture() {
  const calls: string[] = []
  const skill = { id: 'source-a', name: 'Synthetic', path: '/synthetic/skill', content: 'Synthetic instructions' }
  const server = { name: 'synthetic-docs', status: { status: 'connected' } }
  let pause: (() => Promise<void>) | undefined
  const data = {
    location: {
      skill: {
        list: () => [skill],
        sync: async () => {
          await pause?.()
          calls.push('skill-sync')
        },
        invalidate: () => calls.push('skill-invalidate'),
      },
      mcp: {
        server: {
          list: () => [server],
          sync: async () => {
            calls.push('mcp-sync')
          },
          invalidate: () => calls.push('mcp-invalidate'),
        },
      },
    },
  }
  const session = {
    id: 'synthetic-session',
    directory: '/synthetic/project',
    visit: {},
    pending: false,
    location: { directory: '/synthetic/project', workspaceID: 'worktree-a' },
    server: {
      id: 'remote-server',
      connected: true,
      compatible: true,
      data,
      client: {
        experimental: {
          session: {
            skill: async () => {
              calls.push('remote-skill')
            },
          },
          mcp: {
            connect: async () => {
              calls.push('remote-connect')
            },
            disconnect: async () => {
              calls.push('remote-disconnect')
            },
          },
        },
      },
    },
  }
  const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
  const scope = access.capture()!
  const target = {
    key: scope.target.key,
    scope: 'synthetic',
    routing: { directory: scope.target.directory, workspace: scope.target.workspace },
  }

  return {
    calls,
    session,
    sources: createGuiCatalogSources(access, scope),
    target,
    pause: (value: () => Promise<void>) => {
      pause = value
    },
  }
}

test('GUI catalogs use native stable projections and only the selected remote client for mutations', async () => {
  const context = fixture()
  const { skills, mcp, changeMcp } = context.sources
  const signal = new AbortController().signal
  const skill = skills.list(context.target)[0]

  expect(skills.list(context.target)[0]).toBe(skill)
  expect(mcp.list(context.target)[0]).toBe(mcp.list(context.target)[0])
  await skills.refresh(context.target, true, signal)
  await skills.use(context.target, skill, signal)
  await changeMcp(context.target, 'synthetic-docs', 'disconnect', signal)
  expect(context.calls).toEqual(['skill-invalidate', 'skill-sync', 'remote-skill', 'remote-disconnect'])
  context.session.server.connected = false
  expect(skills.list(context.target)[0]).toBe(skill)
  await Promise.resolve(expect(mcp.refresh(context.target, false, signal)).rejects.toThrow('offline'))
})

test('GUI catalogs reject foreign locations and stale sync results without mutating a new session', async () => {
  const context = fixture()
  const signal = new AbortController().signal

  expect(() => context.sources.skills.list({ ...context.target, routing: { directory: '/synthetic/other' } })).toThrow(
    'location changed',
  )
  let resume!: () => void

  context.pause(
    () =>
      new Promise((resolve) => {
        resume = resolve
      }),
  )
  const refresh = context.sources.skills.refresh(context.target, false, signal)

  context.session.visit = {}
  resume()
  await Promise.resolve(expect(refresh).rejects.toThrow('session or server changed'))
  expect(context.sources.skills.list(context.target)).toEqual([])
  expect(context.sources.mcp.list(context.target)).toEqual([])
  expect(context.calls).not.toContain('remote-skill')
})
