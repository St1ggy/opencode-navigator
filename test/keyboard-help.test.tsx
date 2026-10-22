/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'

import { KeyboardHelpDialog } from '../src/features/keyboard-help/ui/keyboard-help-dialog'
import { sidebarShortcutActions } from '../src/features/sidebar-shortcuts'
import { setHostCapabilities } from '../src/shared/lib/host-capabilities'
import { IconProvider } from '../src/shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

test('keyboard help uses the shortcut inventory and scrolls within a short modal using keyboard commands', async () => {
  type Layer = Parameters<TuiPluginApi['keymap']['registerLayer']>[0]
  const layers: Layer[] = []
  let cleanups = 0
  const api = {
    theme: { current: { text: '#ffffff', textMuted: '#aaaaaa', backgroundPanel: '#202020' } },
    keymap: {
      registerLayer(layer: Layer) {
        layers.push(layer)

        return () => {
          cleanups++
        }
      },
    },
  } as unknown as TuiPluginApi

  setHostCapabilities(api, { todo: true, lsp: true })
  const setup = await testRender(
    () => (
      <IconProvider style={() => 'text'}>
        <KeyboardHelpDialog api={api} shortcuts={sidebarShortcutActions(api)} />
      </IconProvider>
    ),
    { width: 40, height: 22 },
  )

  try {
    await setup.flush()
    const body = setup.renderer.root.findDescendantById('opencode-navigator.keyboard-help.body') as ScrollBoxRenderable
    const commands = layers.flatMap((layer) => layer.commands ?? [])

    expect(body.height).toBeLessThanOrEqual(9)
    commands.find(({ name }) => name.endsWith('.3'))!.run({} as never)
    await setup.flush()
    expect(body.scrollTop).toBeGreaterThan(0)
    const allText: string[] = []

    for (let y = 0; y <= body.scrollHeight; y += body.height) {
      body.scrollTo(y)
      await setup.flush()
      allText.push(setup.captureCharFrame())
    }
    const text = allText.join(' ').replaceAll(/\s+/g, ' ')

    expect(text).toContain('Check update')
    expect(text).toContain('Update Navigator')
    expect(text).toContain('Ctrl+,')
  } finally {
    setup.renderer.destroy()
  }
  expect(cleanups).toBe(1)
})
