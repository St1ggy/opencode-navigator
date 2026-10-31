import { expect, test } from 'bun:test'

import { createTodoSetupController } from '../src/features/native-todo-setup'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('native Todo capture scenes use synthetic config and preview without writing', async () => {
  const { createNativeTodoScene, openWizardScene } = await import(
    new URL('../screenshots/harness/native-todo-scenes.mjs', import.meta.url).href
  )
  const lifecycle = new AbortController()
  const api = {
    lifecycle: { signal: lifecycle.signal },
    route: { current: { name: 'session', params: { sessionID: 'synthetic' } } },
  } as unknown as TuiPluginApi
  let opened = 0
  const services = {
    createTodoSetupController,
    createNativeTodoController: () => ({ source: 'native' }),
    NativeTodoSetupDialog: () => null,
    createDialogStack: () => ({
      open: () => {
        opened++
      },
    }),
  }

  try {
    for (const scene of ['native-todo-disabled', 'native-todo-enabled-empty', 'native-todo-config-error']) {
      const fixture = createNativeTodoScene(api, scene, services)
      const controller = fixture.controller('synthetic')

      await controller.setup.refresh('synthetic')
      expect(controller.setup.state('synthetic').enabled).toBe(
        scene === 'native-todo-config-error' ? undefined : scene === 'native-todo-enabled-empty',
      )
    }
    const fixture = createNativeTodoScene(api, 'native-todo-enable-preview', services)

    fixture.controller('synthetic')
    const commands: string[] = []
    const timers: (() => void)[] = []

    fixture.open(
      (name: string) => commands.push(name),
      (run: () => void) => timers.push(run),
    )
    for (const run of timers) run()
    expect(opened).toBe(1)
    expect(commands).toEqual(['opencode-navigator.selection-menu.select'])
    const wizard: string[] = []

    openWizardScene(
      'setup-v2-actions',
      (name: string) => wizard.push(name),
      (run: () => void) => run(),
    )
    expect(wizard).toHaveLength(3)
  } finally {
    lifecycle.abort()
  }
})
