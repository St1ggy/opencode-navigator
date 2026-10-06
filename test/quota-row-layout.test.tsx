/** @jsxImportSource @opentui/solid */
import { type BoxRenderable, RGBA } from '@opentui/core'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { QuotaWindowRow } from '../src/features/provider-limits/ui/quota-window-row'
import { IconProvider } from '../src/shared/ui'

import type { QuotaWindow } from '../src/entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const window: QuotaWindow = {
  id: 'quota',
  scope: 'account',
  label: 'Secondary',
  unit: '%',
  used: 29,
  durationMinutes: 10_080,
  resetsAt: 1_800_000_000,
}
const api = { theme: { current: { text: '#ffffff', textMuted: '#aaaaaa' } } } as unknown as TuiPluginApi

async function harness(style: 'nerd' | 'text' = 'nerd') {
  const [width, setWidth] = createSignal(34)
  const setup = await testRender(
    () => (
      <IconProvider style={() => style}>
        <box width={width()} paddingLeft={3} paddingRight={2} marginLeft={7} id="sidebar">
          <QuotaWindowRow api={api} window={window} />
        </box>
      </IconProvider>
    ),
    { width: 80, height: 8 },
  )

  await setup.flush()

  return { ...setup, setWidth }
}

test.each(['nerd', 'text'] as const)(
  'quota lines fill the padded sidebar width without block glyphs (%s)',
  async (style) => {
    const h = await harness(style)

    try {
      const sidebar = h.renderer.root.findDescendantById('sidebar') as BoxRenderable
      const lines = h.captureCharFrame().split('\n')
      const row = lines.findIndex((line) => line.includes('71% left'))
      const left = sidebar.screenX + 3
      const right = sidebar.screenX + sidebar.width - 2

      expect(lines[row].slice(left, right)).toContain('71% left')
      expect(Bun.stringWidth(lines[row].trimEnd())).toBe(right)
      expect(lines[row]).not.toMatch(/[[\]█░#]/)
      expect(lines[row + 1].slice(right).trim()).toBe('')
      expect(lines[row + 1]).not.toContain('Account')
      expect(lines[row + 1]).not.toContain('1w')
      const offset = (row * h.renderer.currentRenderBuffer.width + left) * 4

      expect(
        new RGBA(h.renderer.currentRenderBuffer.buffers.fg.slice(offset, offset + 4)).equals(RGBA.fromHex('#ffffff')),
      ).toBe(true)
    } finally {
      h.renderer.destroy()
    }
  },
)

test('quota lines recompute their scale on shrink and growth without painting outside the content area', async () => {
  const h = await harness()

  try {
    for (const width of [26, 46]) {
      h.setWidth(width)
      await h.flush()
      const lines = h.captureCharFrame().split('\n')
      const row = lines.findIndex((line) => line.includes('71% left'))
      const right = 7 + width - 2

      expect(Bun.stringWidth(lines[row].trimEnd())).toBe(right)
      expect(lines[row].slice(right).trim()).toBe('')
      expect(lines[row + 1].slice(right).trim()).toBe('')
    }
  } finally {
    h.renderer.destroy()
  }
})

test('reset text is clipped at the padded sidebar edge even when the terminal is wider', async () => {
  const h = await harness()

  try {
    h.setWidth(26)
    await h.flush()
    const lines = h.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.trimStart().startsWith('Resets '))

    expect(lines[row].slice(7 + 26 - 2).trim()).toBe('')
  } finally {
    h.renderer.destroy()
  }
})
