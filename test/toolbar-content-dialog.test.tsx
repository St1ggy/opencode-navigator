import { expect, test } from 'bun:test'

import { openToolbarPin } from '../src/features/sidebar-settings/model/open-toolbar'

import { toolbarHarness } from './fixtures/toolbar-harness'

test('additional icons and text remain unsaved until Pin; nested cancellation preserves the parent draft', async () => {
  const h = await toolbarHarness()

  try {
    openToolbarPin({
      api: h.api,
      preferences: h.preferences,
      skills: h.skills,
      pin: { kind: 'action', id: 'session.new', icon: 'plus' },
    })
    await h.click('Icons and text')
    await h.click('Base icons')
    await h.click('Add icon')
    await h.wait('Choose an icon')
    await h.mockInput.typeText('rocket')
    h.mockInput.pressEnter()
    await h.wait('Use these icons')
    await h.click('Use these icons')
    await h.click('Text…')
    h.prompt().onConfirm?.('Launch')
    await h.flush()
    expect(h.preferences.toolbarPins()).toEqual([])
    h.mockInput.pressEscape()
    await h.wait('Pin to toolbar')
    await h.click('Pin to toolbar')
    expect(h.preferences.toolbarPins()[0]).toMatchObject({ icons: ['plus', 'rocket'], text: 'Launch' })
    await h.preferences.flush()
    await h.preferences.reloadFromFile()
    expect(h.preferences.toolbarPins()[0]).toMatchObject({ icons: ['plus', 'rocket'], text: 'Launch' })
  } finally {
    h.renderer.destroy()
  }
})

test('zero icons can be saved with text without creating an invisible empty button', async () => {
  const h = await toolbarHarness()

  try {
    openToolbarPin({
      api: h.api,
      preferences: h.preferences,
      skills: h.skills,
      pin: { kind: 'action', id: 'session.new', icon: 'plus' },
    })
    await h.click('Icons and text')
    await h.click('Text…')
    h.prompt().onConfirm?.('Only text')
    await h.flush()
    await h.click('Base icons')
    await h.click('Remove icon 1')
    await h.click('Use these icons')
    h.mockInput.pressEscape()
    await h.wait('Pin to toolbar')
    await h.click('Pin to toolbar')
    expect(h.preferences.toolbarPins()[0]).toMatchObject({ icons: [], text: 'Only text' })
  } finally {
    h.renderer.destroy()
  }
})
