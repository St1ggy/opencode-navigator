import { expect, test } from 'bun:test'

import { toolbarHarness } from './fixtures/toolbar-harness'

test('packaged deferred Settings and pin dialogs share the active host capability and action-state registries', async () => {
  // @ts-expect-error Published bundles intentionally have no declarations.
  const main = await import('../dist/tui.js')
  // @ts-expect-error Published bundles intentionally have no declarations.
  const toolbar = await import('../dist/toolbar-settings.js')
  const h = await toolbarHarness()

  try {
    main.setHostCapabilities(h.api, { todo: true, lsp: false, titleVisibility: false, permissionMode: false })
    main.openSettings(h.api, h.preferences, 'toolbar_overflow', undefined, h.skills)
    await h.wait('Toolbar overflow')
    expect(h.captureCharFrame()).not.toContain('Default auto-approve permissions')
    h.api.ui.dialog.clear()
    await h.flush()
    main.setQuickActionStateSource(h.api, (id: string) => (id === 'session.compact' ? 'idle' : undefined))
    toolbar.openToolbarPin({
      api: h.api,
      preferences: h.preferences,
      skills: h.skills,
      pin: { kind: 'action', id: 'session.compact', icon: 'refresh' },
    })
    await h.wait('Compacting')
    expect(h.captureCharFrame()).toContain('Idle')
  } finally {
    h.renderer.destroy()
  }
})
