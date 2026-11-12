import { expect, test } from 'bun:test'

import { navigatorUpdateAction } from '../../src/entities/navigator-release/model'

test('one update action transitions through check, offer, progress and restart', () => {
  const idle = { checking: false, busy: false, available: false }

  expect(navigatorUpdateAction(idle).kind).toBe('check')
  expect(navigatorUpdateAction({ ...idle, checking: true, busy: true }).label).toContain('Checking')
  expect(navigatorUpdateAction({ ...idle, available: true, latest: '1.2.4' })).toMatchObject({
    kind: 'update',
    detail: 'Install 1.2.4',
  })
  expect(
    navigatorUpdateAction({ ...idle, busy: true, progress: { phase: 'downloading', received: 4, total: 10 } }).label,
  ).toBe('Downloading 40%')
  expect(navigatorUpdateAction({ ...idle, busy: true, progress: { phase: 'installing' } }).label).not.toContain('%')
  expect(navigatorUpdateAction({ ...idle, available: true, restart: '1.2.4' }).kind).toBe('restart')
})
