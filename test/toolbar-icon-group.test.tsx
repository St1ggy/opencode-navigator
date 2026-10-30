/** @jsxImportSource @opentui/solid */
import { expect, test } from 'bun:test'

import { ToolbarIconGroupDialog } from '../src/features/sidebar-settings/ui/toolbar-icon-group-dialog'
import { createDialogStack } from '../src/shared/ui'

import { toolbarHarness } from './fixtures/toolbar-harness'

test('icon groups keep order, cap the picker at three and discard nested edits on Escape', async () => {
  const h = await toolbarHarness()
  const dialogs = createDialogStack(h.api)
  const applied: (readonly string[])[] = []

  try {
    dialogs.open(() => (
      <ToolbarIconGroupDialog
        api={h.api}
        title="Icon group"
        initial={['plus', 'rocket', 'check']}
        onConfirm={(value) => applied.push(value)}
      />
    ))
    await h.flush()
    expect(h.captureCharFrame()).not.toContain('Add icon')
    await h.click('Remove icon 1')
    await h.click('Add icon')
    await h.wait('Choose an icon')
    await h.mockInput.typeText('star')
    h.mockInput.pressEnter()
    await h.wait('Use these icons')
    expect(h.captureCharFrame()).not.toContain('Add icon')
    h.mockInput.pressEscape()
    await h.flush()
    expect(applied).toEqual([])
    dialogs.open(() => (
      <ToolbarIconGroupDialog
        api={h.api}
        title="Icon group"
        initial={['rocket', 'check', 'star']}
        onConfirm={(value) => applied.push(value)}
      />
    ))
    await h.click('Use these icons')
    expect(applied).toEqual([['rocket', 'check', 'star']])
  } finally {
    h.renderer.destroy()
  }
})
