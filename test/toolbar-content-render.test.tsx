/** @jsxImportSource @opentui/solid */
import { expect, test } from 'bun:test'

import { createSidebarInteraction } from '../src/pages/session-sidebar'
import { SidebarToolbar } from '../src/pages/session-sidebar/ui/sidebar-toolbar'
import { terminalIcon, uiIcon } from '../src/shared/ui'

import { toolbarHarness } from './fixtures/toolbar-harness'

import type { SidebarInteraction } from '../src/pages/session-sidebar'
import type { BoxRenderable } from '@opentui/core'

test.each(['nerd', 'text'] as const)(
  'multiple icons and custom text fit within rounded buttons and stable hint rows: %s',
  async (style) => {
    let interaction!: SidebarInteraction
    const h = await toolbarHarness((api, preferences, skills) => {
      interaction = createSidebarInteraction(api)

      return (
        <box ref={(node) => interaction.setContentRoot(node)} width={18} gap={1} focusable>
          <SidebarToolbar api={api} preferences={preferences} skills={skills} interaction={interaction} />
          <text id="limits-anchor">LIMITS</text>
        </box>
      )
    })

    try {
      h.setStyle(style)
      h.preferences.changeToolbarPin({
        operation: 'pin',
        pin: { kind: 'action', id: 'session.new', icon: 'plus', icons: ['plus', 'rocket'], text: 'Start' },
      })
      await h.flush()
      const button = h.renderer.root.findDescendantById(
        'opencode-navigator.toolbar.action:session.new',
      ) as BoxRenderable
      const anchor = h.renderer.root.findDescendantById('limits-anchor') as BoxRenderable
      const y = anchor.screenY

      expect(button.width).toBe(11)
      expect(h.captureCharFrame()).toContain(`${terminalIcon('plus', style)} ${terminalIcon('rocket', style)} Start`)
      await h.mockMouse.moveTo(button.screenX + 2, button.screenY)
      await h.flush()
      expect(anchor.screenY).toBe(y)
      h.preferences.changeToolbarPin({
        operation: 'configure',
        key: 'action:session.new',
        icon: 'plus',
        icons: [],
        text: 'A very long text label that must be clipped',
      })
      await h.flush()
      expect((h.renderer.root.findDescendantById(button.id) as BoxRenderable).width).toBe(18)
      expect(anchor.screenY).toBe(y)
      expect(h.captureCharFrame().split('\n', 1)[0].length).toBeGreaterThan(0)

      if (style === 'nerd') expect(h.captureCharFrame().split('\n', 1)[0][17]).toBe(uiIcon('selectionRight'))

      h.preferences.changeToolbarPin({ operation: 'remove', key: 'action:session.new' })
      h.preferences.changeToolbarPin({
        operation: 'pin',
        pin: {
          kind: 'action',
          id: 'permission.mode',
          icon: 'shield',
          text: 'Allow',
          stateIconLists: { on: ['shield', 'unlock', 'check'] },
        },
      })
      await h.flush()
      const stateful = h.renderer.root.findDescendantById(
        'opencode-navigator.toolbar.action:permission.mode',
      ) as BoxRenderable
      const stateWidth = stateful.width

      h.setPermission(true)
      await h.flush()
      expect(h.renderer.root.findDescendantById(stateful.id)).toBe(stateful)
      expect(stateful.width).toBe(stateWidth)
      expect(anchor.screenY).toBe(y)
    } finally {
      interaction.dispose()
      h.renderer.destroy()
    }
  },
)
