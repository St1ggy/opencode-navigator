import { expect, test } from 'bun:test'

import { createGuiQuickActions } from '../../src/app/gui/adapters/quick-actions'
import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'

import type { Context, MountedSession } from '@opencode/plugin/gui'

test('GUI Quick Actions dispatch only audited native commands and open settings instead of toggling permissions', async () => {
  const calls: string[] = []
  const session = {
    id: 'session',
    directory: '/synthetic/project',
    location: { directory: '/synthetic/project' },
    visit: {},
    server: { id: 'remote', data: { session: { message: { list: () => [] } } } },
  }
  const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
  const scope = access.capture()!
  const source = createGuiQuickActions(
    {
      sessions: { current: () => session },
      commands: {
        run: (id: string) => {
          calls.push(id)

          return true
        },
      },
      layout: {
        settings: (page: string) => {
          calls.push(`settings:${page}`)
        },
      },
    } as unknown as Context,
    access,
    scope,
  )
  const signal = new AbortController().signal

  expect(source.inspect('permission.mode', scope.target).label).toBe('Permissions settings')
  expect(source.inspect('session.compact', scope.target).reason).toBe('Requires conversation messages')
  expect(source.inspect('session.rename', scope.target).available).toBe(false)
  await source.execute('permission.mode', scope.target, signal)
  await source.execute('session.new', scope.target, signal)
  expect(calls).toEqual(['settings:general', 'tab.new'])
  session.visit = {}
  await expect(source.execute('session.new', scope.target, signal)).rejects.toThrow('Session or server changed')
  expect(calls).toHaveLength(2)
})
