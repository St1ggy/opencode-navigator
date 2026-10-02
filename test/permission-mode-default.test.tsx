/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { pluginConfig } from '../src/config'
import { createPreferencesController } from '../src/controllers/preferences'
import { PermissionModeBinding } from '../src/features/sidebar-settings'
import { createPreferencesStore } from '../src/preferences-store'
import { setHostCapabilities, supportsPermissionMode } from '../src/shared/lib/host-capabilities'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('OpenCode 1.x remembers host permission-mode changes globally and restores them on the next launch', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-permission-default-'))
  let auto = true
  let dispatched = 0
  const listeners = new Set<() => void>()
  const api = {
    ui: { toast() {} },
    keymap: {
      getCommands: () => [
        {
          name: 'permission.mode',
          title: `${auto ? 'Disable' : 'Enable'} auto-approve permissions`,
        },
      ],
      on: (_event: string, handler: () => void) => {
        listeners.add(handler)

        return () => listeners.delete(handler)
      },
      dispatchCommand: () => {
        dispatched++
        auto = !auto
        for (const listener of listeners) listener()

        return { ok: true }
      },
    },
  } as unknown as TuiPluginApi
  const store = createPreferencesStore(directory)

  try {
    const first = createPreferencesController(api, pluginConfig(undefined), store)

    await first.load()
    const firstView = await testRender(() => <PermissionModeBinding api={api} preferences={first} />)

    try {
      await firstView.flush()
      expect(dispatched).toBe(0) // No saved default: respect explicit host startup mode.
      api.keymap.dispatchCommand('permission.mode')
      await first.flush()
      expect((await store.load()).user.autoApprovePermissions).toBe(false)
    } finally {
      firstView.renderer.destroy()
    }

    const second = createPreferencesController(api, pluginConfig(undefined), store)

    await second.load()
    second.setAutoApprovePermissions(true)
    await second.flush()
    auto = false
    const secondView = await testRender(() => <PermissionModeBinding api={api} preferences={second} />)

    try {
      await secondView.flush()
      expect(auto).toBe(true)
      expect(dispatched).toBe(2)
      second.setAutoApprovePermissions(false)
      await secondView.flush()
      await second.flush()
      expect(auto).toBe(false)
      expect((await store.load()).user.autoApprovePermissions).toBe(false)
    } finally {
      secondView.renderer.destroy()
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('OpenCode 2.x keeps permission defaults in host settings, not the 1.x permission-mode binding', () => {
  const api = {} as TuiPluginApi

  setHostCapabilities(api, { todo: true, lsp: false, permissionMode: false })
  expect(supportsPermissionMode(api)).toBe(false)
})

test('Skill groups survive unrelated preferences written by another instance in any worktree', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-user-groups-'))

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await first.update({ user: { skillGroup: { location: '/skills/a/SKILL.md', group: 'Code & Testing' } } })
    await second.update({ target: { kind: 'worktree', key: '/other' }, behavior: { startInChat: true } })
    await first.update({ user: { autoApprovePermissions: true } })
    await second.update({ user: { favoriteSkill: { location: '/skills/b/SKILL.md', favorite: true } } })
    const saved = await first.load()

    expect(saved.user.skillGroups).toEqual({ '/skills/a/SKILL.md': 'Code & Testing' })
    expect(saved.user.autoApprovePermissions).toBe(true)
    expect(saved.user.favoriteSkills).toEqual(['/skills/b/SKILL.md'])
    expect(saved.worktrees['/other'].behavior?.startInChat).toBe(true)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
