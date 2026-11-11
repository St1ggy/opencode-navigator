import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { updateProgressView } from '../../src/entities/navigator-release/model'
import { createPreferencesModel, emptyPreferencesDocument } from '../../src/entities/preferences/model'
import { pluginConfig } from '../../src/shared/config'
import { reorderItems } from '../../src/shared/lib/reorder'

test('reordering is stable in both directions and rejects missing ids without changing input', () => {
  const items = [{ id: 'one' }, { id: 'two' }, { id: 'three' }]
  const key = (item: { id: string }) => item.id

  expect(reorderItems(items, 'one', 'three', key).map((item) => key(item))).toEqual(['two', 'three', 'one'])
  expect(reorderItems(items, 'three', 'one', key).map((item) => key(item))).toEqual(['three', 'one', 'two'])
  expect(reorderItems(items, 'missing', 'one', key)).toEqual(items)
  expect(items.map((item) => key(item))).toEqual(['one', 'two', 'three'])
  expect(reorderItems(items, 'one', 'three', key)[2]).toBe(items[0])
})

test('update percentage is derived only from finite provider byte counts', () => {
  expect(updateProgressView({ phase: 'downloading', received: 25, total: 100 })).toEqual({
    label: 'Downloading 25%',
    fraction: 0.25,
  })
  expect(updateProgressView({ phase: 'downloading', received: 300, total: 100 }).fraction).toBe(1)
  expect(updateProgressView({ phase: 'installing' }).fraction).toBeUndefined()
  expect(updateProgressView({ phase: 'downloading', received: 25, total: 0 }).fraction).toBeUndefined()
  expect(updateProgressView({ phase: 'downloading', received: Infinity, total: 100 }).fraction).toBeUndefined()
})

test('section ordering stays temporary and rejects a stale Global/Worktree drop', async () => {
  const root = createRoot((dispose) => ({
    dispose,
    model: createPreferencesModel({ notifications: { show() {} }, validKey: () => true }, pluginConfig({}), {
      load: async () => emptyPreferencesDocument(),
      update: async () => {},
      flush: async () => {},
    }),
  }))

  try {
    await root.model.load()
    const scope = root.model.selectedScopeKey()
    const original = root.model.selectedSectionOrder()

    root.model.reorderSelectedSection(original[0], original[1], scope)
    expect(root.model.selectedSectionOrder().slice(0, 2)).toEqual([original[1], original[0]])
    root.model.setActiveScope('/synthetic/worktree')
    root.model.setPreferenceScope('worktree')
    const next = root.model.selectedSectionOrder()

    root.model.reorderSelectedSection(next[0], next[1], scope)
    expect(root.model.selectedSectionOrder()).toEqual(next)
  } finally {
    root.dispose()
  }
})
