/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { IconProvider, terminalIcon, terminalIconIDs } from '../src/shared/ui'
import { IconPicker } from '../src/shared/ui/icon-picker/icon-picker'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable, InputRenderable } from '@opentui/core'

test.each(['nerd', 'text'] as const)(
  'icon picker searches keywords, previews, navigates rows and selects by mouse (%s)',
  async (style) => {
    let commands: { name: string; run(): void }[] = []
    const selected: string[] = []
    const api = {
      theme: {
        current: {
          backgroundPanel: '#202020',
          backgroundElement: '#303030',
          primary: '#5577aa',
          text: '#eeeeee',
          textMuted: '#aaaaaa',
          accent: '#ffaa00',
          selectedListItemText: '#ffffff',
        },
      },
      keymap: {
        registerLayer: (layer: { commands: typeof commands }) => {
          commands = layer.commands

          return () => {}
        },
      },
      ui: { dialog: { clear() {} } },
    } as unknown as TuiPluginApi
    const h = await testRender(
      () => (
        <IconProvider style={() => style} multilineCorners={() => false}>
          <IconPicker api={api} value="plus" onSelect={(id) => selected.push(id)} />
        </IconProvider>
      ),
      { width: 62, height: 28 },
    )

    try {
      await h.flush()
      expect(h.captureCharFrame()).toContain('plus · selected')
      const run = (suffix: string) => commands.find((command) => command.name.endsWith(`.${suffix}`))!.run()

      run('left')
      run('select')
      expect(selected).toEqual(['plus'])
      run('down')
      run('select')
      expect(selected[1]).not.toBe('plus')
      const button = h.renderer.root.findDescendantById('icon-picker.plus') as BoxRenderable

      await h.mockMouse.click(button.screenX + 1, button.screenY)
      expect(selected.at(-1)).toBe('plus')
      ;(h.renderer.root.findDescendantById('icon-picker.search') as InputRenderable).focus()
      await h.mockInput.typeText('clipboard')
      await h.flush()
      expect(h.captureCharFrame()).toContain('copy')
      run('select')
      expect(selected.at(-1)).toBe('copy')
      await h.mockInput.typeText('no-match')
      await h.flush()
      expect(h.captureCharFrame()).toContain('No matching icons')
      const count = selected.length

      run('select')
      expect(selected).toHaveLength(count)
      for (const id of terminalIconIDs) expect(Bun.stringWidth(terminalIcon(id, style))).toBe(1)
    } finally {
      h.renderer.destroy()
    }
  },
)

test('icon picker remains inside a short narrow terminal and responds to a light-theme change', async () => {
  const [background, setBackground] = createSignal('#111111')
  const api = {
    theme: {
      get current() {
        return {
          backgroundPanel: background(),
          backgroundElement: '#444444',
          primary: '#5577aa',
          text: background() === '#111111' ? '#ffffff' : '#111111',
          textMuted: '#888888',
          accent: '#227799',
          selectedListItemText: '#ffffff',
        }
      },
    },
    keymap: { registerLayer: () => () => {} },
    ui: { dialog: { clear() {} } },
  } as unknown as TuiPluginApi
  const h = await testRender(() => <IconPicker api={api} value="check" onSelect={() => {}} />, {
    width: 30,
    height: 20,
  })

  try {
    await h.flush()
    for (const [width, height] of [
      [30, 20],
      [24, 18],
      [45, 22],
    ]) {
      h.renderer.resize(width, height)
      setBackground('#eeeeee')
      await h.flush()
      const surface = h.renderer.root.findDescendantById('opencode-navigator.icon-picker') as BoxRenderable

      expect(surface.screenX + surface.width).toBeLessThanOrEqual(width)
      expect(surface.screenY + surface.height).toBeLessThanOrEqual(height)
      expect(h.captureCharFrame()).toContain('Choose an icon')
    }
  } finally {
    h.renderer.destroy()
  }
})
