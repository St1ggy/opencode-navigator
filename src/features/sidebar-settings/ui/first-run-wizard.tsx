import { Suspense, lazy } from 'solid-js'

import { createDialogStack } from '../../../shared/ui'

import type { FirstRunWizard as WizardContent } from './first-run-wizard-content'
import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const Content = lazy(async () => {
  const path = import.meta.url.includes('/dist/') ? './onboarding.js' : './first-run-wizard-content'
  const module = (await import(path)) as { FirstRunWizard: typeof WizardContent }

  return { default: module.FirstRunWizard }
})

export function FirstRunWizard(props: Parameters<typeof WizardContent>[0]) {
  return (
    <box>
      <Suspense>
        <Content {...props} />
      </Suspense>
    </box>
  )
}

export function openFirstRunWizard(api: TuiPluginApi, preferences: PreferencesController) {
  createDialogStack(api, preferences.lspIconStyle, () => true, preferences.cornerFont).open(() => (
    <FirstRunWizard api={api} preferences={preferences} />
  ))
}

export async function showFirstRunWizard(api: TuiPluginApi, preferences: PreferencesController) {
  if (!(await preferences.claimFirstRun())) return false

  openFirstRunWizard(api, preferences)

  return true
}
