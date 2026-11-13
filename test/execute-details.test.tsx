/** @jsxImportSource @opentui/solid */
import { RGBA } from '@opentui/core'
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'

import { ExecuteDetails } from '../src/features/code-mode'
import { IconProvider } from '../src/shared/ui'

import type { ExecuteRun } from '../src/features/code-mode/model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

test.each(['text', 'nerd'] as const)(
  'execute inspector supports tabs, raw payloads and metadata in %s mode',
  async (style) => {
    const color = RGBA.fromHex('#bbbbbb')
    let layer: { commands: { name: string; run(): void }[]; bindings: { key: string; cmd: string }[] } | undefined
    let disposed = false
    const api = {
      theme: {
        current: {
          text: color,
          textMuted: color,
          primary: color,
          accent: color,
          backgroundPanel: RGBA.fromHex('#111111'),
          backgroundElement: RGBA.fromHex('#222222'),
          selectedListItemText: color,
        },
      },
      ui: {
        dialog: {
          clear() {
            /*
             * No host dialog is mounted in this renderer fixture.
             */
          },
        },
      },
      keymap: {
        registerLayer(value: typeof layer) {
          layer = value

          return () => {
            disposed = true
          }
        },
      },
    } as unknown as TuiPluginApi
    const run: ExecuteRun = {
      id: 'synthetic-operation',
      messageID: 'synthetic-message',
      status: 'completed',
      created: 1,
      started: 10,
      completed: 1210,
      input: { code: 'return 42' },
      output: ['Synthetic result', ...Array.from({ length: 40 }, (_, index) => `Synthetic line ${index}`)].join('\n'),
      nested: 'unavailable',
    }
    const setup = await testRender(
      () => (
        <IconProvider style={() => style}>
          <ExecuteDetails api={api} run={() => run} />
        </IconProvider>
      ),
      { width: 80, height: 30 },
    )
    const key = (value: string) => {
      const binding = layer!.bindings.find((item) => item.key === value)!

      layer!.commands.find((item) => item.name === binding.cmd)!.run()
    }

    try {
      await setup.flush()
      expect(setup.captureCharFrame()).toContain('Synthetic result')
      expect(setup.captureCharFrame()).toContain('1.2s')
      expect(setup.captureCharFrame()).not.toContain('synthetic-operation')
      key('j')
      key('j')
      key('j')
      await setup.flush()
      const previousScroll = (
        setup.renderer.root.findDescendantById('navigator.execute.payload') as ScrollBoxRenderable
      ).scrollTop

      expect(previousScroll).toBeGreaterThan(0)
      key('1')
      await setup.flush()
      expect(setup.captureCharFrame()).toContain('return 42')
      expect(setup.captureCharFrame()).not.toContain('"code"')
      key('v')
      await setup.flush()
      expect(setup.captureCharFrame()).toContain('"code"')
      key('3')
      await setup.flush()
      expect(setup.captureCharFrame()).toContain('Error is unavailable')
      const lines = setup.captureCharFrame().split('\n')
      const row = lines.findIndex((line) => line.includes('Code') && line.includes('Response'))

      await setup.mockMouse.click(lines[row].indexOf('Code'), row)
      await setup.flush()
      expect(setup.captureCharFrame()).toContain('"code"')
      key('i')
      await setup.flush()
      expect(setup.captureCharFrame()).toContain('synthetic-operation')
      key('right')
      await setup.flush()
      expect(
        (setup.renderer.root.findDescendantById('navigator.execute.payload') as ScrollBoxRenderable).scrollTop,
      ).toBe(previousScroll)
    } finally {
      setup.renderer.destroy()
    }
    expect(disposed).toBe(true)
  },
)
