/** @jsxImportSource @opentui/solid */
import { expect, test } from 'bun:test'

import { createSidebarInteraction } from '../src/pages/session-sidebar'
import { SidebarToolbar } from '../src/pages/session-sidebar/ui/sidebar-toolbar'

import { toolbarHarness } from './fixtures/toolbar-harness'

import type { SidebarInteraction } from '../src/pages/session-sidebar'
import type { BoxRenderable } from '@opentui/core'

test.each(['menu', 'wrap'] as const)(
  'wrapped and More hints keep the next section stationary: %s',
  async (overflow) => {
    let interaction!: SidebarInteraction
    const h = await toolbarHarness((api, preferences, skills) => {
      interaction = createSidebarInteraction(api)

      return (
        <box ref={(node) => interaction.setContentRoot(node)} gap={1} width={7} focusable>
          <SidebarToolbar api={api} preferences={preferences} skills={skills} interaction={interaction} />
          <text id="limits-anchor">LIMITS</text>
        </box>
      )
    })

    try {
      for (const id of ['permission.mode', 'session.new'] as const)
        h.preferences.changeToolbarPin({ operation: 'pin', pin: { kind: 'action', id, icon: 'arrow-down' } })
      h.preferences.changeToolbarPin({
        operation: 'pin',
        pin: { kind: 'skill', name: 'Absent', location: '/synthetic/absent', icon: 'book' },
      })

      if (overflow === 'wrap') h.preferences.toggleToolbarOverflow()

      await h.flush()
      const anchor = h.renderer.root.findDescendantById('limits-anchor') as BoxRenderable
      const y = anchor.screenY
      const key = overflow === 'menu' ? 'toolbar:more' : 'skill:/synthetic/absent'
      const button = h.renderer.root.findDescendantById(`opencode-navigator.toolbar.${key}`) as BoxRenderable

      await h.mockMouse.moveTo(button.screenX + 1, button.screenY)
      await h.flush()
      expect(anchor.screenY).toBe(y)
      expect(button.width).toBe(3)
      expect(button.getChildren()[0].screenX).toBe(button.screenX + 1)
      await h.mockMouse.moveTo(35, 35)
      await h.flush()
      expect(anchor.screenY).toBe(y)
    } finally {
      interaction.dispose()
      h.renderer.destroy()
    }
  },
)
