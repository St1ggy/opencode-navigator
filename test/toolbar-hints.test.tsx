/** @jsxImportSource @opentui/solid */
import { expect, test } from 'bun:test'

import { createSidebarInteraction } from '../src/pages/session-sidebar'
import { SidebarToolbar } from '../src/pages/session-sidebar/ui/sidebar-toolbar'

import { toolbarHarness } from './fixtures/toolbar-harness'

import type { SidebarInteraction } from '../src/pages/session-sidebar'
import type { BoxRenderable } from '@opentui/core'

test.each(['nerd', 'text'] as const)(
  'toolbar hints use the existing gap and centered uniform controls: %s',
  async (style) => {
    let interaction!: SidebarInteraction
    const h = await toolbarHarness((api, preferences, skills) => {
      interaction = createSidebarInteraction(api)

      return (
        <box ref={(node) => interaction.setContentRoot(node)} gap={1} focusable>
          <SidebarToolbar api={api} preferences={preferences} skills={skills} interaction={interaction} />
          <text id="limits-anchor">LIMITS</text>
        </box>
      )
    })

    const node = (id: string) => h.renderer.root.findDescendantById(id) as BoxRenderable

    try {
      h.setStyle(style)
      h.preferences.changeToolbarPin({
        operation: 'pin',
        pin: { kind: 'action', id: 'session.new', icon: 'arrow-down' },
      })
      await h.flush()
      const button = node('opencode-navigator.toolbar.action:session.new')
      const bounds = [button.screenX, button.screenY, button.width, button.height]
      const y = node('limits-anchor').screenY

      await h.mockMouse.moveTo(button.screenX + 1, button.screenY)
      await h.flush()
      expect(h.captureCharFrame(), 'hover hint').toContain('New session')
      expect(node('limits-anchor').screenY).toBe(y)
      expect([button.screenX, button.screenY, button.width, button.height]).toEqual(bounds)
      expect(button.width).toBe(3)
      expect(button.getChildren()[0].screenX).toBe(button.screenX + 1)
      await h.mockMouse.moveTo(35, 35)
      await h.flush()
      expect(node('limits-anchor').screenY).toBe(y)
      interaction.focus(undefined, button.id)
      await h.flush()
      expect(node('limits-anchor').screenY).toBe(y)
      expect(h.captureCharFrame(), 'keyboard focus hint').toContain('New session')
      interaction.leave()
      h.preferences.changeToolbarPin({ operation: 'remove', key: 'action:session.new' })
      await h.flush()
      expect(node('opencode-navigator.toolbar')).toBeUndefined()
      expect(node('limits-anchor').screenY).toBe(0)
    } finally {
      interaction.dispose()
      h.renderer.destroy()
    }
  },
)
