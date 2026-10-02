/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  SettingsDialog,
  // @ts-expect-error The package intentionally publishes JavaScript without declarations.
} from '../dist/tui.js'
import { pluginConfig } from '../src/config'
import { createPreferencesController } from '../src/controllers/preferences'
import { createPreferencesStore } from '../src/preferences-store'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('Settings can reload another OpenCode session’s saved preferences by mouse or keyboard', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-reload-ui-'))
  const commands = new Map<string, () => void>()
  let reloaded!: () => void
  let notified = new Promise<void>((resolve) => {
    reloaded = resolve
  })
  const api = {
    theme: {
      current: {
        text: '#ffffff',
        textMuted: '#888888',
        accent: '#00ffff',
        backgroundElement: '#222222',
        backgroundPanel: '#111111',
        borderSubtle: '#444444',
      },
    },
    keymap: {
      registerLayer: (layer: { commands?: { name: string; run: () => void }[] }) => {
        const layerCommands = layer.commands ?? []

        for (const command of layerCommands) commands.set(command.name, command.run)

        return () => {}
      },
    },
    ui: {
      toast(input: { message: string }) {
        if (input.message === 'Saved settings reloaded') reloaded()
      },
      dialog: { replace() {}, clear() {}, setSize() {} },
    },
  } as unknown as TuiPluginApi

  try {
    const reader = createPreferencesController(api, pluginConfig(undefined), createPreferencesStore(directory))
    const writer = createPreferencesController(api, pluginConfig(undefined), createPreferencesStore(directory))

    await Promise.all([reader.load(), writer.load()])
    writer.toggleFavoriteSkill({ location: '/skills/review/SKILL.md' })
    await writer.flush()
    const setup = await testRender(
      () => <SettingsDialog api={api} preferences={reader} activeValue="reload_settings" />,
      { width: 100, height: 30 },
    )

    try {
      await setup.flush()
      const lines = setup.captureCharFrame().split('\n')
      const row = lines.findIndex((line) => line.includes('Reload settings from file'))

      expect(row).toBeGreaterThan(-1)
      await setup.mockMouse.click(lines[row].indexOf('Reload settings from file'), row)
      await notified
      expect(reader.favoriteSkills()).toEqual(new Set(['/skills/review/SKILL.md']))

      notified = new Promise<void>((resolve) => {
        reloaded = resolve
      })
      writer.toggleFavoriteSkill({ location: '/skills/search/SKILL.md' })
      await writer.flush()
      commands.get('opencode-navigator.settings.select')?.()
      await notified
      expect(reader.favoriteSkills()).toEqual(new Set(['/skills/review/SKILL.md', '/skills/search/SKILL.md']))
    } finally {
      setup.renderer.destroy()
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
