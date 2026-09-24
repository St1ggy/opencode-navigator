/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'

import { pluginConfig } from '../src/config'
import { createPreferencesController } from '../src/controllers/preferences'
import { TrustedSkillsDialog } from '../src/features/sidebar-settings'
import { IconProvider } from '../src/icons/context'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('trusted skills can be revoked individually or reset together', async () => {
  let commands: { name: string; run: () => void }[] = []
  const api = {
    theme: {
      current: {
        text: '#ffffff',
        textMuted: '#888888',
        backgroundElement: '#222222',
        backgroundPanel: '#111111',
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
  const preferences = createPreferencesController(api, pluginConfig(undefined), {
    load: async () => ({
      global: {},
      worktrees: {},
      user: {
        skippedSkillConfirmations: ['/skills/commit/SKILL.md', '/skills/review/SKILL.md'],
      },
    }),
    update: async () => {},
    flush: async () => {},
  })

  await preferences.load()
  const setup = await testRender(
    () => (
      <IconProvider style={() => 'text'}>
        <TrustedSkillsDialog api={api} preferences={preferences} />
      </IconProvider>
    ),
    { width: 70, height: 22 },
  )
  const run = (name: string) => commands.find((command) => command.name.endsWith(`.${name}`))?.run()

  try {
    await setup.flush()
    expect(setup.captureCharFrame()).toContain('Trusted skills')
    expect(setup.captureCharFrame()).toContain('/skills/commit/SKILL.md')
    run('next')
    run('select')
    await setup.flush()
    expect(preferences.trustedSkillLocations()).toEqual(['/skills/review/SKILL.md'])
    expect(setup.captureCharFrame()).not.toContain('/skills/commit/SKILL.md')
    run('select')
    await setup.flush()
    expect(preferences.trustedSkillLocations()).toEqual([])
    expect(setup.captureCharFrame()).toContain('Every skill requires confirmation')
  } finally {
    setup.renderer.destroy()
  }
})
