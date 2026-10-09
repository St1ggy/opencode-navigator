/** @jsxImportSource @opentui/solid */
import { type BoxRenderable, RGBA } from '@opentui/core'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { QuotaWindowGroup } from '../src/features/provider-limits/ui/quota-window-group'
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

async function harness(style: 'nerd' | 'text' = 'nerd', windows: readonly QuotaWindow[] = [window]) {
  const [width, setWidth] = createSignal(34)
  const setup = await testRender(
    () => (
      <IconProvider style={() => style}>
        <box width={width()} paddingLeft={3} paddingRight={2} marginLeft={7} id="sidebar">
          <QuotaWindowGroup api={api} windows={windows} />
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
      expect(lines[row].slice(right - 8, right)).toBe('71% left')
      expect(lines[row - 1].slice(left, right)).toMatch(style === 'nerd' ? /^[━─]+$/ : /^[=-]+$/)
      expect(h.captureCharFrame()).not.toMatch(/[│|]/)
      expect(lines[row - 1]).not.toMatch(/[[\]█░#]/)
      expect(lines[row - 1].slice(right).trim()).toBe('')
      expect(lines[row]).not.toContain('Account')
      expect(lines[row]).not.toContain('1w')
      const offset = (row * h.renderer.currentRenderBuffer.width + right - 8) * 4

      expect(
        new RGBA(h.renderer.currentRenderBuffer.buffers.fg.slice(offset, offset + 4)).equals(RGBA.fromHex('#ffffff')),
      ).toBe(true)
      const muted = ((row - 1) * h.renderer.currentRenderBuffer.width + left) * 4

      expect(
        new RGBA(h.renderer.currentRenderBuffer.buffers.fg.slice(muted, muted + 4)).equals(RGBA.fromHex('#aaaaaa')),
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
      // Width-dependent text follows the parent layout pass.
      await h.flush()
      const lines = h.captureCharFrame().split('\n')
      const row = lines.findIndex((line) => line.includes('71% left'))
      const right = 7 + width - 2

      expect(Bun.stringWidth(lines[row].trimEnd())).toBe(right)
      expect(lines[row].slice(right).trim()).toBe('')
      expect(lines[row].slice(right - 8, right)).toBe('71% left')
      expect(lines[row - 1].slice(right).trim()).toBe('')
      expect(Bun.stringWidth(lines[row - 1].trimEnd())).toBe(right)
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
    const row = lines.findIndex((line) => line.includes('71% left'))

    expect(lines[row].slice(7 + 26 - 2).trim()).toBe('')
    expect(lines[row].trimEnd()).toEndWith('71% left')
    expect(lines[row].slice(10, 23).trim()).not.toContain('71%')
    expect(lines[row].slice(10, 23)).toContain('...')
  } finally {
    h.renderer.destroy()
  }
})

test.each(['nerd', 'text'] as const)(
  'quota windows keep one blank gap without a vertical guide or gutter (%s)',
  async (style) => {
    const h = await harness(style, [window, { ...window, id: 'second', used: 74 }])

    try {
      const lines = h.captureCharFrame().split('\n')
      const first = lines.findIndex((line) => line.includes('71% left'))
      const second = lines.findIndex((line) => line.includes('26% left'))

      expect(second).toBe(first + 3)
      expect(lines[first + 1].trim()).toBe('')
      expect(h.captureCharFrame()).not.toMatch(/[│|]/)
      const sidebar = h.renderer.root.findDescendantById('sidebar') as BoxRenderable
      const left = sidebar.screenX + 3

      expect(lines[first - 1][left]).toBe(style === 'nerd' ? '━' : '=')
      expect(lines[second - 1][left]).toBe(style === 'nerd' ? '━' : '=')
    } finally {
      h.renderer.destroy()
    }
  },
)

test('unknown scales and long native measurements stay inside extremely narrow content', async () => {
  const h = await harness('text', [{ ...window, used: undefined, remaining: 1234, unit: 'provider-native calls' }])

  try {
    expect(h.captureCharFrame()).toContain('Scale unknown')
    h.setWidth(16)
    await h.flush()
    const sidebar = h.renderer.root.findDescendantById('sidebar') as BoxRenderable
    const right = sidebar.screenX + sidebar.width - 2
    const lines = h.captureCharFrame().split('\n')

    for (const line of lines) expect(line.slice(right).trim()).toBe('')
    expect(lines[1].trimStart()).toStartWith('1234')
    expect(lines[1].trimEnd()).not.toContain('Resets')
  } finally {
    h.renderer.destroy()
  }
})
