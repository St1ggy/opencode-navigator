import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createMainPreferencesHandlers } from '../../src/app/gui/adapters/main-preferences'
import { emptyPreferencesDocument } from '../../src/entities/preferences/model'
import { createPreferencesStore } from '../../src/entities/preferences/storage'

const caller = () => ({ signal: new AbortController().signal })

test.each([
  { user: { token: 'not-a-preference' } },
  { target: { kind: 'worktree' } },
  { behavior: { limitsRefreshMinutes: 0 } },
  { behavior: { sectionItemLimits: { unknown: 2 } } },
  { behavior: { quickActionVisibility: { unknown: true } } },
  { user: { toolbarPin: { operation: 'pin', pin: { kind: 'action', id: 'not-allowlisted', icon: 'star' } } } },
  { user: { pendingResetAttempt: { accountID: 'account' } } },
  {
    user: {
      pendingResetAttempt: {
        providerID: 'synthetic',
        modelID: 'model',
        accountID: 'account',
        idempotencyKey: 'invalid',
        createdAt: 1,
      },
    },
  },
])('Desktop preference IPC rejects invalid input before touching storage: %j', async (change) => {
  let writes = 0
  const handlers = createMainPreferencesHandlers({
    load: async () => emptyPreferencesDocument(),
    update: async () => {
      writes++
    },
    flush: async () => {},
  })

  await Promise.resolve(
    expect(handlers.update({ change: JSON.stringify(change) }, caller())).rejects.toThrow(
      'Invalid Navigator preferences update',
    ),
  )
  expect(writes).toBe(0)
})

test('Desktop preference IPC shares the established filesystem document/lock with TUI writes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-gui-prefs-'))
  const tui = createPreferencesStore(directory)
  const gui = createMainPreferencesHandlers(createPreferencesStore(directory))

  try {
    await Promise.all([
      tui.update({ user: { skillGroup: { location: '/synthetic/skill', group: 'Development' } } }),
      gui.update(
        { change: JSON.stringify({ user: { favoriteMcpServer: { name: 'synthetic-docs', favorite: true } } }) },
        caller(),
      ),
    ])
    await gui.flush(undefined, caller())
    const document = JSON.parse(await gui.load(undefined, caller()))

    expect(document.user.skillGroups).toEqual({ '/synthetic/skill': 'Development' })
    expect(document.user.favoriteMcpServers).toEqual(['synthetic-docs'])
    await gui.update(
      {
        change: JSON.stringify({
          behavior: { sectionItemLimits: { skills: 3 }, quickActionVisibility: { 'session.new': false } },
        }),
      },
      caller(),
    )
    expect((await tui.load()).global.behavior?.sectionItemLimits).toEqual({ skills: 3 })
  } finally {
    await tui.flush()
    await rm(directory, { recursive: true, force: true })
  }
})

test('Desktop preference IPC bounds payloads and rejects already-cancelled writes', async () => {
  let writes = 0
  const handlers = createMainPreferencesHandlers({
    load: async () => emptyPreferencesDocument(),
    update: async () => {
      writes++
    },
    flush: async () => {},
  })

  await Promise.resolve(
    expect(handlers.update({ change: ' '.repeat(1_000_001) }, caller())).rejects.toThrow('too large'),
  )
  const signal = AbortSignal.abort()

  await Promise.resolve(
    expect(handlers.update({ change: '{}' }, { signal })).rejects.toMatchObject({ name: 'AbortError' }),
  )
  expect(writes).toBe(0)
})
