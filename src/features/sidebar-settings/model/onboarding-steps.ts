import { hostCapabilities } from '../../../shared/lib/host-capabilities'

import { createOnboardingSteps } from './onboarding-content'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export { ONBOARDING_STEPS } from './onboarding-content'
export type { OnboardingStep } from './onboarding-content'

export function onboardingSteps(api: TuiPluginApi) {
  const capabilities = hostCapabilities(api)

  return createOnboardingSteps({
    nativeTodo: capabilities.nativeTodo === true,
    lsp: capabilities.lsp,
    permissionMode: capabilities.permissionMode !== false,
  })
}
