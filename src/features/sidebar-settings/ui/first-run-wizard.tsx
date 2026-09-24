import { TextAttributes } from '@opentui/core'
import { Show, createSignal, onCleanup } from 'solid-js'

import { SECTION_DEFINITIONS } from '../../../entities/sidebar-layout'
import { PLUGIN_ID } from '../../../shared/config'
import { supportsSidebarSection } from '../../../shared/lib/host-capabilities'
import { DialogSurface, createDialogStack, useDialogs, useIcons } from '../../../shared/ui'
import { ONBOARDING_STEPS } from '../model/onboarding-steps'

import { OnboardingStep } from './onboarding-step'
import { SectionConfig } from './section-config'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function FirstRunWizard(props: { api: TuiPluginApi; preferences: PreferencesController }) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const [active, setActive] = createSignal(0)
  const [step, setStep] = createSignal(0)
  const theme = () => props.api.theme.current
  const sections = SECTION_DEFINITIONS.filter((section) => supportsSidebarSection(props.api, section.name))
  const finishIndex = sections.length
  const stepCount = ONBOARDING_STEPS.length + 1
  const configuring = () => step() === ONBOARDING_STEPS.length

  function finish() {
    dialogs.back()
  }

  function move(offset: number) {
    if (configuring()) setActive((value) => (value + offset + finishIndex + 1) % (finishIndex + 1))
    else setStep((value) => Math.max(0, Math.min(ONBOARDING_STEPS.length, value + offset)))
  }

  function back() {
    setStep((value) => Math.max(0, value - 1))
  }

  function advance() {
    if (!configuring()) setStep((value) => Math.min(ONBOARDING_STEPS.length, value + 1))
  }

  function select() {
    if (!configuring()) {
      advance()

      return
    }

    const index = active()

    if (index === finishIndex) finish()
    else props.preferences.toggleSection(sections[index].name)
  }

  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      {
        name: `${PLUGIN_ID}.wizard.previous`,
        run() {
          move(-1)
        },
      },
      {
        name: `${PLUGIN_ID}.wizard.next`,
        run() {
          move(1)
        },
      },
      {
        name: `${PLUGIN_ID}.wizard.select`,
        run: select,
      },
      { name: `${PLUGIN_ID}.wizard.back`, run: back },
      { name: `${PLUGIN_ID}.wizard.forward`, run: advance },
    ],
    bindings: [
      { key: 'up', cmd: `${PLUGIN_ID}.wizard.previous` },
      { key: 'down', cmd: `${PLUGIN_ID}.wizard.next` },
      { key: 'tab', cmd: `${PLUGIN_ID}.wizard.next` },
      { key: 'left', cmd: `${PLUGIN_ID}.wizard.back` },
      { key: 'right', cmd: `${PLUGIN_ID}.wizard.forward` },
      { key: 'space', cmd: `${PLUGIN_ID}.wizard.select` },
      { key: 'return', cmd: `${PLUGIN_ID}.wizard.select` },
    ],
  })

  onCleanup(unregister)

  return (
    <DialogSurface api={props.api}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          {icons.icon('help')} Navigator setup
        </text>
        <text
          fg={theme().textMuted}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            finish()
          }}
        >
          Step {step() + 1}/{stepCount} · {icons.key('esc')}
        </text>
      </box>
      <Show
        when={configuring()}
        fallback={
          <OnboardingStep
            api={props.api}
            preferences={props.preferences}
            step={ONBOARDING_STEPS[step()]}
            final={step() === ONBOARDING_STEPS.length - 1}
            onBack={back}
            onAdvance={advance}
          />
        }
      >
        <SectionConfig
          api={props.api}
          preferences={props.preferences}
          active={active()}
          onActive={setActive}
          onBack={back}
          onFinish={finish}
        />
      </Show>
    </DialogSurface>
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
