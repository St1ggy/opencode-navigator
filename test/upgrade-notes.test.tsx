/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'

import {
  type PreferencesDocument,
  type PreferencesUpdate,
  applyPreferencesUpdate,
  createPreferencesController,
  emptyPreferencesDocument,
} from '../src/entities/preferences'
import { UpgradeNotesBinding, changesSince } from '../src/features/upgrade-notes'
import { pluginConfig } from '../src/shared/config'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

const versions = { older: '1.2.3', previous: '1.3.0', current: '1.3.1' }
const changelog = `# Changelog

## Unreleased

- Not shipped yet.

## [${versions.current}] - 2026-09-25

- Make version labels clickable.

## [${versions.previous}] - 2026-09-25

- Add version update confirmations.

## [${versions.older}] - 2026-09-24

- Add OpenCode 2 support.
`

function preferences(api: TuiPluginApi, initial: PreferencesDocument = emptyPreferencesDocument()) {
  let document = initial
  const controller = createPreferencesController(api, pluginConfig(undefined), {
    async load() {
      return document
    },
    async update(change: PreferencesUpdate) {
      document = applyPreferencesUpdate(document, change)
    },
    async flush() {},
  })

  return { controller, document: () => document }
}

test('changelog includes only shipped entries newer than the previous installed version', () => {
  expect(changesSince(changelog, versions.previous, versions.current)).toEqual([
    { version: versions.current, changes: ['Make version labels clickable.'] },
  ])
  expect(changesSince(changelog, versions.older, versions.current).map((entry) => entry.version)).toEqual([
    versions.current,
    versions.previous,
  ])
  expect(changesSince(changelog, versions.current, versions.current)).toEqual([])
})

test('fresh installs only record the current version; installed and external upgrades retain the previous version once', async () => {
  const api = { ui: { toast() {} } } as unknown as TuiPluginApi
  const fresh = preferences(api)

  expect(await fresh.controller.claimNavigatorUpgrade(versions.previous)).toBeUndefined()
  expect(fresh.document().user).toMatchObject({ lastNavigatorVersion: versions.previous })
  await fresh.controller.rememberNavigatorVersionBeforeUpdate(versions.previous)
  expect(fresh.document().user.previousNavigatorVersion).toBe(versions.previous)
  expect(await fresh.controller.claimNavigatorUpgrade(versions.current)).toBe(versions.previous)
  expect(await fresh.controller.claimNavigatorUpgrade(versions.current)).toBeUndefined()

  const external = preferences(api, {
    global: {},
    worktrees: {},
    user: { lastNavigatorVersion: versions.older },
  })

  expect(await external.controller.claimNavigatorUpgrade(versions.current)).toBe(versions.older)
  expect(external.document().user).toMatchObject({
    lastNavigatorVersion: versions.current,
    previousNavigatorVersion: versions.older,
  })
})

test('updated launches open release notes once and leave first-run onboarding undisturbed', async () => {
  const dialogs: (() => unknown)[] = []
  const dialog = {
    open: true,
    replace: (render: () => unknown) => dialogs.push(render),
    setSize() {},
    clear() {},
  }
  const api = {
    ui: {
      dialog,
      toast() {},
    },
    keymap: { registerLayer: () => () => {} },
    lifecycle: { signal: new AbortController().signal },
    theme: {
      current: {
        backgroundPanel: '#111111',
        primary: '#333333',
        text: '#ffffff',
        textMuted: '#888888',
        accent: '#ffaa00',
        selectedListItemText: '#ffffff',
      },
    },
  } as unknown as TuiPluginApi
  const saved = preferences(api, { global: {}, worktrees: {}, user: { lastNavigatorVersion: versions.previous } })
  const view = await testRender(
    () => (
      <UpgradeNotesBinding
        api={api}
        preferences={saved.controller}
        version={versions.current}
        read={async () => changelog}
      />
    ),
    { width: 50, height: 10 },
  )

  try {
    await view.flush()
    await Bun.sleep(0)
    expect(dialogs).toHaveLength(0)
    dialog.open = false
    await Bun.sleep(250)
    expect(dialogs).toHaveLength(1)
    expect(saved.document().user.previousNavigatorVersion).toBe(versions.previous)
    const modal = await testRender(() => <box paddingTop={5}>{dialogs[0]() as JSX.Element}</box>, {
      width: 70,
      height: 30,
    })

    try {
      await modal.renderOnce()
      const frame = modal.captureCharFrame()

      expect(frame).toContain('Navigator updated')
      expect(frame).toMatch(/Changes from \d+\.\d+\.\d+ to \d+\.\d+\.\d+/)
      expect(frame).toContain('Make version labels clickable.')
    } finally {
      modal.renderer.destroy()
    }
  } finally {
    view.renderer.destroy()
  }
})
