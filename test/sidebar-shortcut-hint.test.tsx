/** @jsxImportSource @opentui/solid */
import { RGBA, TextAttributes } from '@opentui/core'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { sidebarShortcutActions } from '../src/features/sidebar-shortcuts'
import { SidebarShortcutHint } from '../src/features/sidebar-shortcuts/ui/shortcut-hint'
import { setHostCapabilities } from '../src/shared/lib/host-capabilities'
import { IconProvider, uiIcon } from '../src/shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable, InputRenderable } from '@opentui/core'

const dark = {
  background: '#101010',
  backgroundPanel: '#202020',
  backgroundElement: '#404040',
  text: '#ffffff',
  textMuted: '#bbbbbb',
  accent: '#ffaa00',
}
const light = {
  background: '#fafafa',
  backgroundPanel: '#eeeeee',
  backgroundElement: '#cccccc',
  text: '#111111',
  textMuted: '#555555',
  accent: '#772200',
}

async function harness(style: 'nerd' | 'text' = 'nerd', width = 80, height = 26, cornerFont = true) {
  const [theme, setTheme] = createSignal(dark)
  const api = {
    theme: {
      get current() {
        return theme()
      },
    },
  } as unknown as TuiPluginApi
  let prompt!: InputRenderable

  setHostCapabilities(api, { todo: true, lsp: true })
  const actions = sidebarShortcutActions(api)
  const setup = await testRender(
    () => (
      <IconProvider style={() => style} multilineCorners={() => cornerFont}>
        <box width="100%" height="100%" backgroundColor={theme().background}>
          <input
            ref={(node) => {
              prompt = node
            }}
            width={16}
          />
          <SidebarShortcutHint api={api} actions={actions} />
        </box>
      </IconProvider>
    ),
    { width, height },
  )

  await setup.flush()
  prompt.focus()
  await setup.flush()

  return { ...setup, actions, prompt, setTheme }
}

test.each(['nerd', 'text'] as const)('shortcut hint groups every action with highlighted keys (%s)', async (style) => {
  const h = await harness(style)

  try {
    const frame = h.captureCharFrame()

    expect(frame).toContain('Navigator shortcuts')
    expect(frame).toContain('Navigate')
    expect(frame).toContain('Updates')
    expect(frame).toContain('Esc')
    expect(frame).toContain('Cancel')
    expect(frame).not.toContain(' | ')
    for (const action of h.actions) expect(frame).toContain(action.label)
    expect(h.renderer.currentFocusedRenderable).toBe(h.prompt)
    const y = frame.split('\n').findIndex((line) => line.includes('Toggle sidebar'))
    const x = frame.split('\n')[y].indexOf('h')
    const buffer = h.renderer.currentRenderBuffer
    const key = buffer.withBuffers(({ fg, bg, attributes }) => {
      const cell = y * buffer.width + x

      return {
        fg: new RGBA(fg.slice(cell * 4, cell * 4 + 4)),
        bg: new RGBA(bg.slice(cell * 4, cell * 4 + 4)),
        attributes: attributes[cell],
      }
    })

    expect(key.fg.equals(RGBA.fromHex(dark.accent))).toBe(true)
    expect(key.bg.equals(RGBA.fromHex(dark.backgroundElement))).toBe(true)
    expect(key.attributes & TextAttributes.BOLD).toBe(TextAttributes.BOLD)
  } finally {
    h.renderer.destroy()
  }
})

test('hint layout survives narrow and short terminal resizes without stealing prompt focus', async () => {
  const h = await harness()

  try {
    for (const [width, height] of [
      [28, 14],
      [80, 12],
      [22, 20],
    ]) {
      h.renderer.resize(width, height)
      await h.flush()
      const hint = h.renderer.root.findDescendantById('opencode-navigator.shortcuts.hint') as BoxRenderable
      const frame = h.captureCharFrame()

      expect(hint.screenX).toBeGreaterThanOrEqual(0)
      expect(hint.screenX + hint.width).toBeLessThanOrEqual(width)
      expect(hint.screenY + hint.height).toBeLessThanOrEqual(height)
      expect(frame).toContain('Esc')
      expect(frame).toContain('Cancel')
      for (const action of h.actions)
        expect(frame).toContain(`${uiIcon('selectionLeft')}${action.key}${uiIcon('selectionRight')}`)
      expect(h.renderer.currentFocusedRenderable).toBe(h.prompt)
    }
  } finally {
    h.renderer.destroy()
  }
})

test('hint theme updates and no-corner mode preserve Nerd icons and rounded key tokens', async () => {
  const h = await harness('nerd', 80, 26, false)

  try {
    expect(h.captureCharFrame()).not.toContain(uiIcon('selectionTopLeft'))
    expect(h.captureCharFrame()).toContain(uiIcon('help'))
    expect(h.captureCharFrame()).toContain(`${uiIcon('selectionLeft')}c${uiIcon('selectionRight')}`)
    h.setTheme(light)
    await h.flush()
    const lines = h.captureCharFrame().split('\n')
    const y = lines.findIndex((line) => line.includes('Toggle sidebar'))
    const x = lines[y].indexOf('h')
    const buffer = h.renderer.currentRenderBuffer
    const offset = (y * buffer.width + x) * 4
    const foreground = buffer.withBuffers(({ fg }) => new RGBA(fg.slice(offset, offset + 4)))

    expect(foreground.equals(RGBA.fromHex(light.accent))).toBe(true)
  } finally {
    h.renderer.destroy()
  }
})
