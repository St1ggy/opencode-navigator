/** @jsxImportSource @opentui/solid */
import { expect, test } from 'bun:test'

import { type SidebarInteraction, createSidebarInteraction } from '../src/pages/session-sidebar'
import { toolbarLayout } from '../src/pages/session-sidebar/model/toolbar-layout'
import { SidebarToolbar } from '../src/pages/session-sidebar/ui/sidebar-toolbar'
import { terminalIcon } from '../src/shared/ui'

import { toolbarHarness } from './fixtures/toolbar-harness'

import type { BoxRenderable } from '@opentui/core'

test('toolbar layout reserves More and wraps visual rows using three-cell buttons', () => {
  expect(toolbarLayout(['a', 'b', 'c', 'd'], 11, 'menu')).toEqual({
    columns: 3,
    overflow: ['c', 'd'],
    rows: [['a', 'b', 'toolbar:more']],
  })
  expect(toolbarLayout(['a', 'b', 'c', 'd'], 7, 'wrap').rows).toEqual([
    ['a', 'b'],
    ['c', 'd'],
  ])
  expect(toolbarLayout(['a'], 2, 'menu').rows).toEqual([['a']])
  expect(toolbarLayout(['a', 'b'], 3, 'menu').rows).toEqual([['toolbar:more']])
  expect(toolbarLayout([], 40, 'wrap').rows).toEqual([])
})

test('toolbar is absent when empty, reacts to state icons, routes overflow, and preserves controls on resize', async () => {
  let interaction!: SidebarInteraction
  let intercepts = 0
  const h = await toolbarHarness((api, preferences, skills) => {
    interaction = createSidebarInteraction(api)

    return (
      <box ref={(node) => interaction.setContentRoot(node)} width={11} id="toolbar-test.root">
        <SidebarToolbar
          api={api}
          preferences={preferences}
          skills={skills}
          interaction={interaction}
          onNewSession={() => {
            intercepts++

            return true
          }}
        />
        <text id="after-toolbar">After</text>
      </box>
    )
  })

  try {
    expect(h.renderer.root.findDescendantById('opencode-navigator.toolbar')).toBeUndefined()
    expect((h.renderer.root.findDescendantById('after-toolbar') as BoxRenderable).screenY).toBe(0)
    h.preferences.changeToolbarPin({
      operation: 'pin',
      pin: { kind: 'action', id: 'permission.mode', icon: 'shield', stateIcons: { on: 'check', off: 'lock' } },
    })
    h.preferences.changeToolbarPin({ operation: 'pin', pin: { kind: 'action', id: 'session.new', icon: 'plus' } })
    h.preferences.changeToolbarPin({
      operation: 'pin',
      pin: { kind: 'skill', location: '/absent/skill', name: 'Absent skill', icon: 'book' },
    })
    h.preferences.changeToolbarPin({
      operation: 'pin',
      pin: { kind: 'skill', location: '/synthetic/review', name: 'review', icon: 'check' },
    })
    await h.flush()
    expect(h.captureCharFrame()).toContain(terminalIcon('lock', 'nerd'))
    const id = 'opencode-navigator.toolbar.action:permission.mode'
    const button = h.renderer.root.findDescendantById(id) as BoxRenderable

    interaction.focus(undefined, id)
    interaction.activate()
    await h.flush()
    expect(h.captureCharFrame()).toContain(terminalIcon('check', 'nerd'))
    expect(h.renderer.root.findDescendantById(id)).toBe(button)
    interaction.focus(undefined, 'opencode-navigator.toolbar.action:session.new')
    interaction.activate()
    expect(intercepts).toBe(1)
    expect(h.dispatched).not.toContain('session.new')
    interaction.focus(undefined, 'opencode-navigator.toolbar.toolbar:more')
    interaction.activate()
    await h.wait('More pinned buttons')
    await h.click('Absent skill')
    expect(h.captureCharFrame()).toContain('More pinned buttons')
    expect(h.toasts.length).toBeGreaterThan(0)
    h.mockInput.pressEscape()
    await h.flush()
    h.preferences.toggleToolbarOverflow()
    await h.flush()
    const skillButton = h.renderer.root.findDescendantById(
      'opencode-navigator.toolbar.skill:/synthetic/review',
    ) as BoxRenderable

    expect(skillButton.screenY).toBeGreaterThan(button.screenY)
    interaction.focus(undefined, id)
    interaction.moveHorizontal(1)
    expect(interaction.selectedId()).toBe('opencode-navigator.toolbar.action:session.new')
    interaction.move(1)
    expect(interaction.selectedId()).toBe('opencode-navigator.toolbar.skill:/synthetic/review')
    h.setStyle('text')
    await h.flush()
    expect(h.captureCharFrame()).not.toContain(terminalIcon('check', 'nerd'))
    const root = h.renderer.root.findDescendantById('toolbar-test.root') as BoxRenderable

    root.width = 7
    await h.flush()
    expect(skillButton.screenX + skillButton.width).toBeLessThanOrEqual(7)
  } finally {
    interaction.dispose()
    h.renderer.destroy()
  }
})
