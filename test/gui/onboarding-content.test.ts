import { expect, test } from 'bun:test'

import { createOnboardingSteps } from '../../src/features/sidebar-settings/model'

test('Desktop onboarding shares six capability slides and reserves the seventh for native section configuration', () => {
  const steps = createOnboardingSteps({ nativeTodo: true, lsp: false, permissionMode: false, desktop: true })
  const copy = steps
    .flatMap((step) => step.features.map((feature) => `${feature.title}: ${feature.description}`))
    .join('\n')

  expect(steps).toHaveLength(6)
  expect(copy).toContain('Enable Todo')
  expect(copy).toContain('chat and todowrite')
  expect(copy).toContain('does not expose LSP')
  expect(copy).toContain('opens host Settings')
  expect(copy).toContain('in-app mini-window')
  expect(copy).not.toMatch(/Ctrl\+,|Nerd Font|corner font/u)
})
