import { expect, test } from 'bun:test'

import { sidebarTypingHarness } from './fixtures/sidebar-typing-harness'

test.each(['legacy-state', 'native-reachable'] as const)(
  'main prompt typing preserves sidebar rows and every frame: %s',
  async (mode) => {
    const h = await sidebarTypingHarness(mode)

    try {
      const original = h.row()

      for (const character of 'typing') {
        await h.mockInput.typeText(character)
        await h.flush()
      }
      expect(h.input()).toBe('typing')
      expect(h.frames.length).toBeGreaterThan(0)
      expect(h.frames.every((frame) => frame.text.includes('Rename'))).toBe(true)
      expect(new Set(h.frames.map((frame) => frame.background)).size).toBe(1)
      expect(h.frames.every((frame) => frame.node === original)).toBe(true)
      h.togglePermission()
      await h.flush()
      expect(h.captureCharFrame()).toContain('Disable auto-approve')
    } finally {
      h.renderer.destroy()
    }
  },
)
