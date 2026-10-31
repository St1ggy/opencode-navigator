/** @jsxImportSource @opentui/solid */
import { expect, test } from 'bun:test'

import { openFirstRunWizard } from '../src/features/sidebar-settings'
import { onboardingSteps } from '../src/features/sidebar-settings/model/onboarding-steps'
import { setHostCapabilities } from '../src/shared/lib/host-capabilities'

import { toolbarHarness } from './fixtures/toolbar-harness'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

test('the seven-slide wizard covers current native Todo, account quotas, toolbar and About without promising unsupported LSP', () => {
  const api = {} as TuiPluginApi

  setHostCapabilities(api, { todo: true, nativeTodo: true, lsp: false, permissionMode: false })
  const steps = onboardingSteps(api)
  const text = JSON.stringify(steps)

  expect(steps).toHaveLength(6)
  expect(text).toContain('Enable Todo')
  expect(text).toContain('todowrite')
  expect(text).toContain('provider and account')
  expect(text).toContain('zero to three icons')
  expect(text).toContain('About and changelog')
  expect(text).toContain('Bug report')
  expect(text).toContain('does not expose LSP')
  expect(text).toContain('opens host Settings')
  expect(text).not.toContain('model quotas')
})

test('short-terminal wizard keeps heading and navigation visible while slide content and section choices scroll', async () => {
  const h = await toolbarHarness(() => <box />)

  try {
    h.renderer.resize(76, 18)
    openFirstRunWizard(h.api, h.preferences)
    await h.wait('Navigator setup')
    await h.wait('Next')
    const body = h.renderer.root.findDescendantById('opencode-navigator.wizard.body') as ScrollBoxRenderable

    expect(body.scrollHeight).toBeGreaterThan(body.height)
    h.api.keymap.dispatchCommand('opencode-navigator.wizard.body.down')
    await h.flush()
    expect(body.scrollTop).toBeGreaterThan(0)
    expect(h.captureCharFrame()).toContain('Step 1/7')
    expect(h.captureCharFrame()).toContain('Next')
    for (let index = 0; index < 6; index++) h.api.keymap.dispatchCommand('opencode-navigator.wizard.select')
    await h.wait('Choose your sidebar sections')
    const choices = h.renderer.root.findDescendantById('opencode-navigator.wizard.body') as ScrollBoxRenderable

    expect(h.captureCharFrame()).toContain('Step 7/7')
    expect(h.captureCharFrame()).toContain('Finish')
    expect(choices.scrollHeight).toBeGreaterThan(choices.height)
    for (let index = 0; index < 6; index++) h.api.keymap.dispatchCommand('opencode-navigator.wizard.next')
    await h.flush()
    expect(choices.scrollTop).toBeGreaterThan(0)
    expect(h.captureCharFrame()).toContain('MCP')
    expect(h.captureCharFrame()).toContain('Finish')
    h.mockInput.pressEscape()
    await Bun.sleep(30)
    await h.flush()
    expect(h.api.ui.dialog.open).toBe(false)
  } finally {
    h.renderer.destroy()
  }
})
