import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createPreferencesStore } from '../src/preferences-store'

import type { SectionVisibility, SidebarSection } from '../src/state'

const defaults: SectionVisibility = {
  todo: true,
  subagents: true,
  skills: true,
  quick_actions: true,
  lsp: true,
  mcp: true,
}

test('stores and clears the default layout', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))
  const layout = {
    sections: { ...defaults, skills: false },
    expanded: { ...defaults, todo: false, skills: true },
  }

  try {
    const store = createPreferencesStore(directory)

    await store.update({ layout })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).global.layout).toEqual(layout)

    await store.update({ clearLayout: true })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).global.layout).toBeUndefined()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('stores and clears user layout presets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))
  const layout = {
    sections: { ...defaults, skills: false },
    expanded: { ...defaults, todo: false },
    order: ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp'] as SidebarSection[],
  }

  try {
    const store = createPreferencesStore(directory)

    await store.update({ user: { layoutPresets: { Focus: layout } } })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).user.layoutPresets).toEqual({ Focus: layout })

    await store.update({ user: { layoutPresets: {} } })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).user.layoutPresets).toBeUndefined()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('preserves concurrent updates from independent store instances', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({ mcp: { scope: '/one', name: 'wiki', state: 'disabled' } }),
      second.update({ mcp: { scope: '/two', name: 'context7', state: 'enabled' } }),
    ])
    await Promise.all([first.flush(), second.flush()])

    expect((await createPreferencesStore(directory).load()).worktrees).toEqual({
      '/one': { mcp: { wiki: 'disabled' } },
      '/two': { mcp: { context7: 'enabled' } },
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('preserves concurrent preset saves from independent store instances', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))
  const layout = {
    sections: defaults,
    expanded: defaults,
    order: ['todo', 'subagents', 'skills', 'quick_actions', 'lsp', 'mcp'] as SidebarSection[],
  }

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({ user: { layoutPreset: { name: 'Focus', layout } } }),
      second.update({ user: { layoutPreset: { name: 'Review', layout } } }),
    ])
    await Promise.all([first.flush(), second.flush()])

    expect(Object.keys((await createPreferencesStore(directory).load()).user.layoutPresets ?? {})).toEqual([
      'Focus',
      'Review',
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('preserves concurrent MCP presets and favorite skills', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({
        user: { mcpPreset: { operation: 'save', name: 'Work', states: { wiki: 'disabled' } } },
      }),
      second.update({ user: { favoriteSkill: { location: '/skills/review', favorite: true } } }),
    ])
    await Promise.all([first.flush(), second.flush()])

    expect((await createPreferencesStore(directory).load()).user).toEqual({
      mcpPresets: { Work: { wiki: 'disabled' } },
      favoriteSkills: ['/skills/review'],
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('merges concurrent favorite skill toggles', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({ user: { favoriteSkill: { location: '/skills/review', favorite: true } } }),
      second.update({ user: { favoriteSkill: { location: '/skills/commit', favorite: true } } }),
    ])
    await Promise.all([first.flush(), second.flush()])

    expect((await createPreferencesStore(directory).load()).user.favoriteSkills).toEqual([
      '/skills/commit',
      '/skills/review',
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('concurrent MCP favorite deltas preserve independent names', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-mcp-favorites-'))

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({ user: { favoriteMcpServer: { name: 'wiki', favorite: true } } }),
      second.update({ user: { favoriteMcpServer: { name: 'context7', favorite: true } } }),
    ])
    expect((await first.load()).user.favoriteMcpServers).toEqual(['context7', 'wiki'])
    await first.update({ user: { favoriteMcpServer: { name: 'wiki', favorite: false } } })
    expect((await second.load()).user.favoriteMcpServers).toEqual(['context7'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('recent skills merge concurrent uses, deduplicate, and retain the latest ten', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-recent-'))

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([first.update({ user: { recentSkill: '/a' } }), second.update({ user: { recentSkill: '/b' } })])
    expect((await first.load()).user.recentSkills?.slice().sort()).toEqual(['/a', '/b'])
    for (let index = 0; index < 12; index++) await first.update({ user: { recentSkill: `/${index}` } })
    await first.update({ user: { recentSkill: '/8' } })
    const recent = (await second.load()).user.recentSkills!

    expect(recent).toHaveLength(10)
    expect(recent[0]).toBe('/8')
    expect(new Set(recent).size).toBe(10)
    expect(recent).not.toContain('/0')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('keeps concurrent MCP preset operations case-insensitive and rename-safe', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))

  try {
    const seed = createPreferencesStore(directory)

    await seed.update({
      user: { mcpPreset: { operation: 'save', name: 'Work', states: { wiki: 'disabled' } } },
    })
    await seed.flush()

    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({ user: { mcpPreset: { operation: 'rename', name: 'Review', previousName: 'Work' } } }),
      second.update({
        user: { mcpPreset: { operation: 'update', name: 'Work', states: { wiki: 'enabled' } } },
      }),
    ])
    await Promise.all([first.flush(), second.flush()])

    const third = createPreferencesStore(directory)
    const fourth = createPreferencesStore(directory)

    await Promise.all([
      third.update({
        user: { mcpPreset: { operation: 'save', name: 'Focus', states: { wiki: 'enabled' } } },
      }),
      fourth.update({
        user: { mcpPreset: { operation: 'save', name: 'focus', states: { wiki: 'disabled' } } },
      }),
    ])
    await Promise.all([third.flush(), fourth.flush()])

    const presets = (await createPreferencesStore(directory).load()).user.mcpPresets ?? {}

    expect(Object.keys(presets).filter((name) => name.toLocaleLowerCase() === 'focus')).toHaveLength(1)
    expect(presets.Review).toBeDefined()
    expect(presets.Work).toBeUndefined()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('merges an update queued before the initial load', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))

  try {
    const store = createPreferencesStore(directory)

    await store.update({ behavior: { toggleKey: 'alt+s' } })
    await store.flush()

    expect((await store.load()).global.behavior).toEqual({ toggleKey: 'alt+s' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('concurrent list-limit deltas preserve other sections and user preferences', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-limits-'))

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({
        behavior: { sectionItemLimits: { todo: 3 } },
        user: { favoriteSkill: { location: '/skill', favorite: true } },
      }),
      second.update({
        behavior: { sectionItemLimits: { mcp: 4 } },
        user: { mcpPreset: { operation: 'save', name: 'Work', states: { wiki: 'enabled' } } },
      }),
    ])
    const saved = await first.load()

    expect(saved.global.behavior?.sectionItemLimits).toEqual({ todo: 3, mcp: 4 })
    expect(saved.user.favoriteSkills).toEqual(['/skill'])
    expect(saved.user.mcpPresets?.Work).toEqual({ wiki: 'enabled' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('concurrent quick-action visibility changes preserve separate actions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-actions-'))

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({ behavior: { quickActionVisibility: { 'session.rename': false } } }),
      second.update({ behavior: { quickActionVisibility: { 'session.export': false } } }),
    ])
    expect((await first.load()).global.behavior?.quickActionVisibility).toEqual({
      'session.rename': false,
      'session.export': false,
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('recovers a lock left by a terminated process', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))
  const preferencesDirectory = join(directory, 'opencode-pretty-sidebar')

  try {
    await mkdir(preferencesDirectory)
    await writeFile(
      join(preferencesDirectory, 'preferences.lock'),
      JSON.stringify({ token: 'stale', pid: 2_147_483_647 }),
    )

    const store = createPreferencesStore(directory)

    expect(await store.load()).toEqual({ global: {}, worktrees: {}, user: {} })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('recovers a stale lock after a recovery owner also terminates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))
  const preferencesDirectory = join(directory, 'opencode-pretty-sidebar')

  try {
    await mkdir(preferencesDirectory)
    await writeFile(
      join(preferencesDirectory, 'preferences.lock'),
      JSON.stringify({ token: 'stale', pid: 2_147_483_647 }),
    )
    await writeFile(
      join(preferencesDirectory, 'preferences.lock.recover.c3RhbGU.0000000000000.2147483647.abandoned'),
      JSON.stringify({ token: 'stale', pid: 2_147_483_647 }),
    )

    const [first, second] = await Promise.all([
      createPreferencesStore(directory).load(),
      createPreferencesStore(directory).load(),
    ])

    expect(first).toEqual({ global: {}, worktrees: {}, user: {} })
    expect(second).toEqual(first)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('stores and resets behavior overrides', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))

  try {
    const store = createPreferencesStore(directory)

    await store.update({
      behavior: {
        toggleKey: 'alt+s',
        focusKey: 'alt+f',
        persistMcp: false,
        lspIconStyle: 'text',
      },
    })
    await store.flush()

    expect((await createPreferencesStore(directory).load()).global.behavior).toEqual({
      toggleKey: 'alt+s',
      focusKey: 'alt+f',
      persistMcp: false,
      lspIconStyle: 'text',
    })

    await store.update({ clearBehavior: true })
    await store.flush()
    expect((await createPreferencesStore(directory).load()).global.behavior).toBeUndefined()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('stores and resets every preference group independently per worktree', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))
  const target = { kind: 'worktree' as const, key: '/repo' }

  try {
    const store = createPreferencesStore(directory)

    await store.update({ target, behavior: { focusKey: 'alt+w' } })
    await store.update({
      target,
      layout: {
        sections: { ...defaults, mcp: false },
        expanded: defaults,
        order: ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp'],
      },
    })
    await store.update({ target, mcp: { states: { wiki: 'disabled', tracker: 'enabled' } } })
    await store.flush()

    expect((await store.load()).worktrees['/repo']).toMatchObject({
      behavior: { focusKey: 'alt+w' },
      layout: { sections: { mcp: false }, order: ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp'] },
      mcp: { tracker: 'enabled', wiki: 'disabled' },
    })

    await store.update({ target, clearLayout: true, clearBehavior: true, clearMcp: true })
    await store.flush()
    expect((await store.load()).worktrees['/repo']).toBeUndefined()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('persists all preference groups in one sanitized document', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))
  const preferencesDirectory = join(directory, 'opencode-pretty-sidebar')
  const preferencesFile = join(preferencesDirectory, 'preferences.json')

  try {
    const store = createPreferencesStore(directory)

    await store.update({ layout: { sections: { skills: false }, expanded: { todo: false } } })
    await store.update({ behavior: { toggleKey: ' alt+s ', focusKey: 'alt+f' } })
    await store.update({ mcp: { scope: '/repo', name: 'wiki', state: 'disabled' } })
    await store.update({ user: { skippedSkillConfirmations: ['/skills/review'], onboardingCompleted: true } })
    await store.flush()

    expect(JSON.parse(await readFile(preferencesFile, 'utf8'))).toEqual({
      global: {
        behavior: { toggleKey: 'alt+s', focusKey: 'alt+f' },
        layout: { sections: { skills: false }, expanded: { todo: false } },
      },
      worktrees: { '/repo': { mcp: { wiki: 'disabled' } } },
      user: { skippedSkillConfirmations: ['/skills/review'], onboardingCompleted: true },
    })
    expect((await stat(preferencesFile)).mode & 0o777).toBe(0o600)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('refuses to overwrite malformed preferences JSON', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pretty-sidebar-store-'))
  const preferencesDirectory = join(directory, 'opencode-pretty-sidebar')
  const preferencesFile = join(preferencesDirectory, 'preferences.json')
  const malformed = '{"global":'

  try {
    await mkdir(preferencesDirectory)
    await writeFile(preferencesFile, malformed)
    const store = createPreferencesStore(directory)

    await expect(store.load()).rejects.toThrow('Malformed preferences JSON')
    await expect(store.update({ behavior: { toggleKey: 'alt+s' } })).rejects.toThrow('Malformed preferences JSON')
    expect(await readFile(preferencesFile, 'utf8')).toBe(malformed)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
