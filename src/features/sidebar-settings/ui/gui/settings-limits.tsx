import { createEffect, createSignal } from 'solid-js'

import { parseLimitsRefreshMinutes } from '../../../../shared/config'

import { GuiSettingsRowIcon } from './settings-row-icon'

import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsLimits(props: Pick<GuiSettingsServices, 'ui' | 'preferences'>) {
  const { Button, SettingsRow, SettingsSection, TextInput } = props.ui
  const [minutes, setMinutes] = createSignal('')
  const validMinutes = () => parseLimitsRefreshMinutes(Number(minutes())) !== undefined

  createEffect(() => setMinutes(String(props.preferences.selectedLimitsRefreshMinutes())))

  return (
    <SettingsSection title="Limits">
      <SettingsRow
        id="navigator-quota-refresh"
        title={
          <GuiSettingsRowIcon ui={props.ui} icon="refresh">
            Limits refresh
          </GuiSettingsRowIcon>
        }
        description="At least one whole minute. Manual refresh and model or account switches remain immediate."
      >
        <div data-navigator-settings-controls>
          <TextInput
            label="Limits refresh in minutes"
            class="navigator-settings-number"
            value={minutes()}
            onInput={setMinutes}
            invalid={!validMinutes()}
          />
          <span>min</span>
          <Button
            icon="check"
            disabled={!validMinutes()}
            onClick={() => props.preferences.setLimitsRefreshMinutes(Number(minutes()))}
          >
            Save interval
          </Button>
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}
