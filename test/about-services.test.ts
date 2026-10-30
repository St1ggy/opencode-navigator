import { expect, test } from 'bun:test'
import { createMemo, createRoot } from 'solid-js'

import metadata from '../package.json'
import { changesSince, parseChangelog } from '../src/entities/navigator-release'
import { getNavigatorAboutServices, registerNavigatorAboutServices } from '../src/features/sidebar-settings'

import type { NavigatorAboutServices } from '../src/features/sidebar-settings'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('manual changelog preserves every version without changing the automatic upgrade interval', () => {
  const source = '## [1.2.4]\n- New behavior\n\n## [1.2.3]\n\n## [1.2.2]\n- Earlier behavior\n'

  expect(parseChangelog(source)).toEqual([
    { version: '1.2.4', changes: ['New behavior'] },
    { version: '1.2.3', changes: [] },
    { version: '1.2.2', changes: ['Earlier behavior'] },
  ])
  expect(changesSince(source, '1.2.2', '1.2.4')).toEqual([{ version: '1.2.4', changes: ['New behavior'] }])
  expect(changesSince(source, '1.2.2', '1.2.3')).toEqual([])
})

test('About registry is reactive, per host, and a stale cleanup cannot remove a newer registration', () => {
  createRoot((dispose) => {
    const api = {} as TuiPluginApi
    const other = {} as TuiPluginApi
    const current = createMemo(() => getNavigatorAboutServices(api))
    const services: NavigatorAboutServices = {
      navigatorVersion: metadata.version,
      openCodeVersion: metadata.devDependencies['@opencode/plugin'],
      checkState: () => ({ status: 'current' }),
      checking: () => false,
      updating: () => false,
      check: async () => {},
      update() {},
      changelog: async () => [],
    }
    const old = registerNavigatorAboutServices(api, services)
    const next = { ...services }
    const latest = registerNavigatorAboutServices(api, next)

    expect(current()).toBe(next)
    expect(getNavigatorAboutServices(other)).toBeUndefined()
    old()
    expect(current()).toBe(next)
    latest()
    expect(current()).toBeUndefined()
    dispose()
  })
})
