import { expect, test } from 'bun:test'

import { openToolbarManager, openToolbarPin } from '../src/features/sidebar-settings/model/open-toolbar'

import { toolbarHarness } from './fixtures/toolbar-harness'

test('pin drafts survive nested picker cancellation and save only explicitly, independently of bookmarks', async () => {
  const h = await toolbarHarness()

  try {
    openToolbarPin({
      api: h.api,
      preferences: h.preferences,
      skills: h.skills,
      pin: { kind: 'action', id: 'permission.mode', icon: 'shield' },
    })
    await h.click('Base icon')
    await h.wait('Choose an icon')
    await h.mockInput.typeText('bolt')
    await h.flush()
    h.mockInput.pressEnter()
    await h.flush()
    await h.wait('Base icon')
    expect(h.preferences.toolbarPins()).toEqual([])
    await h.click('Auto-approve on')
    await h.wait('Choose an icon')
    h.mockInput.pressEscape()
    await h.flush()
    await h.wait('Base icon')
    expect(h.preferences.toolbarPins()).toEqual([])
    await h.click('Pin to toolbar')
    expect(h.preferences.toolbarPins()).toEqual([{ kind: 'action', id: 'permission.mode', icon: 'bolt' }])
    expect(h.preferences.favoriteQuickActions().size).toBe(0)
    openToolbarManager({ api: h.api, preferences: h.preferences, skills: h.skills })
    await h.click('1. Enable auto-approve permissions')
    await h.click('Configure icons')
    await h.click('Cancel')
    expect(h.preferences.toolbarPins()[0].icon).toBe('bolt')
    await h.click('Unpin')
    expect(h.preferences.toolbarPins()).toEqual([])
  } finally {
    h.renderer.destroy()
  }
})

test('manager adds a Skill by exact source from the full list and rejects saving a stale target', async () => {
  const h = await toolbarHarness()

  try {
    openToolbarManager({ api: h.api, preferences: h.preferences, skills: h.skills })
    await h.click('Add Skill')
    h.prompt().onConfirm?.('review')
    await h.flush()
    await h.click('review')
    await h.wait('Pin to toolbar')
    h.setRoute({ name: 'session', params: { sessionID: 'session-two' } })
    // A host route change closes the guarded stack; no draft becomes durable.
    await h.flush()
    expect(h.preferences.toolbarPins()).toEqual([])
  } finally {
    h.renderer.destroy()
  }
})

test('manager reorders pins and saves a discovered Skill without changing its favorite', async () => {
  const h = await toolbarHarness()

  try {
    h.preferences.changeToolbarPin({ operation: 'pin', pin: { kind: 'action', id: 'session.new', icon: 'plus' } })
    openToolbarManager({ api: h.api, preferences: h.preferences, skills: h.skills })
    await h.click('Add Skill')
    h.prompt().onConfirm?.('review')
    await h.flush()
    await h.click('review')
    await h.click('Pin to toolbar')
    expect(h.preferences.toolbarPins()[1]).toMatchObject({ kind: 'skill', location: '/synthetic/review' })
    expect(h.preferences.favoriteSkills().size).toBe(0)
    h.api.ui.dialog.clear()
    openToolbarManager({ api: h.api, preferences: h.preferences, skills: h.skills })
    await h.click('2. review')
    await h.click('Move up')
    expect(h.preferences.toolbarPins()[0]).toMatchObject({ kind: 'skill', name: 'review' })
    await h.click('1. review')
    await h.click('Move down')
    expect(h.preferences.toolbarPins()[1]).toMatchObject({ kind: 'skill', name: 'review' })
  } finally {
    h.renderer.destroy()
  }
})
