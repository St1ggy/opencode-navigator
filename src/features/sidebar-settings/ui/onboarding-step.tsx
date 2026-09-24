import { TextAttributes } from '@opentui/core'
import { For } from 'solid-js'

import { SelectionBox, useIcons } from '../../../shared/ui'

import type { PreferencesController } from '../../../entities/preferences'
import type { OnboardingStep as Step } from '../model/onboarding-steps'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function OnboardingStep(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  step: Step
  final: boolean
  onBack: () => void
  onAdvance: () => void
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current

  return (
    <box gap={1}>
      <text fg={theme().accent} attributes={TextAttributes.BOLD}>
        {icons.icon(props.step.icon)} {props.step.title}
      </text>
      <text fg={theme().textMuted} wrapMode="word">
        {props.step.summary}
      </text>
      <box border={['top', 'bottom']} borderColor={theme().borderSubtle} paddingTop={1} paddingBottom={1} gap={1}>
        <For each={props.step.features}>
          {(feature) => (
            <box flexDirection="row" gap={1}>
              <text flexShrink={0} fg={theme().accent}>
                {icons.icon(feature.icon)}
              </text>
              <text flexGrow={1} minWidth={0} fg={theme().textMuted} wrapMode="word">
                <b>{feature.title}</b> · {feature.description}
              </text>
            </box>
          )}
        </For>
      </box>
      <text fg={theme().textMuted} wrapMode="word">
        Toggle: {props.preferences.toggleKey()} · Focus: {props.preferences.focusKey()} · Icons:{' '}
        {icons.style() === 'text' ? 'Text fallback' : 'Nerd Font'}
      </text>
      <box flexDirection="row" justifyContent="space-between">
        <SelectionBox
          paddingLeft={1}
          paddingRight={1}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            props.onBack()
          }}
        >
          <text fg={theme().textMuted}>{icons.icon('left')} Back</text>
        </SelectionBox>
        <SelectionBox
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={theme().primary}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            props.onAdvance()
          }}
        >
          <text fg={theme().selectedListItemText}>
            {props.final ? 'Configure sidebar' : 'Next'} {icons.icon('right')}
          </text>
        </SelectionBox>
      </box>
    </box>
  )
}
