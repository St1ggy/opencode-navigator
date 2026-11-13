import { createEffect, createSignal } from 'solid-js'

import { parseLimitsRefreshMinutes } from '../../../../shared/config'

import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsBehavior(props: GuiSettingsServices) {
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const Select = props.ui.Select
  const Button = props.ui.Button
  const TextInput = props.ui.TextInput
  const Switch = props.ui.Switch
  const [minutes, setMinutes] = createSignal('')
  const validMinutes = () => parseLimitsRefreshMinutes(Number(minutes())) !== undefined

  createEffect(() => setMinutes(String(props.preferences.selectedLimitsRefreshMinutes())))

  return (
    <>
      <Section title="Behavior">
        <Row
          title="Code Mode activity"
          description="Show execute activity inside MCP or in its own sidebar section. Connection switches stay independent."
        >
          <Select
            label="Code Mode activity placement"
            value={props.preferences.selectedCodeModePlacement()}
            options={[
              { value: 'mcp', label: 'Inside MCP' },
              { value: 'section', label: 'Separate section' },
            ]}
            onChange={(value) => {
              if (value !== props.preferences.selectedCodeModePlacement()) props.preferences.toggleCodeModePlacement()
            }}
          />
        </Row>
        <Row title="Remember MCP states" description="Remember desired connections for this preference scope.">
          <Switch
            label="Remember MCP states"
            hideLabel
            checked={props.preferences.selectedPersistMcp()}
            onChange={props.preferences.toggleMcpPersistence}
          />
        </Row>
        <Row
          title="Session permissions"
          description="OpenCode owns Desktop permission defaults. This opens host Settings; it is not an instant auto-approve toggle."
        >
          <Button onClick={props.hostSettings}>Open host permissions settings</Button>
        </Row>
        <Row
          id="navigator-overflow"
          title="Toolbar overflow"
          description="Keep pins on one row with More, or wrap them onto additional rows."
        >
          <Select
            label="Toolbar overflow"
            value={props.preferences.selectedToolbarOverflow()}
            options={[
              { value: 'menu', label: 'One row with More' },
              { value: 'wrap', label: 'Wrapping rows' },
            ]}
            onChange={(value) => {
              if (value !== props.preferences.selectedToolbarOverflow()) props.preferences.toggleToolbarOverflow()
            }}
          />
        </Row>
        <Row title="Toolbar pins" description="Pins and icon choices are private and shared across worktrees.">
          <Button onClick={props.configureToolbar}>Configure toolbar</Button>
        </Row>
        <Row
          id="navigator-quota-refresh"
          title="Limits refresh"
          description="Whole minutes, at least one. Manual refresh and model/account switches remain immediate."
        >
          <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
            <TextInput
              label="Limits refresh in minutes"
              value={minutes()}
              onInput={setMinutes}
              invalid={!validMinutes()}
            />
            <Button
              disabled={!validMinutes()}
              onClick={() => props.preferences.setLimitsRefreshMinutes(Number(minutes()))}
            >
              Save interval
            </Button>
          </div>
        </Row>
      </Section>
      <Section
        title="Host-owned and terminal-only controls"
        footer="Desktop does not expose a supported startup/New Session interception API for Navigator's terminal-only Start in chat behavior. Host Home/navigation and native keyboard settings stay unchanged."
      >
        <Row
          title="Theme, fonts and keyboard shortcuts"
          description="Use OpenCode Desktop preferences. Navigator does not change cli.json, tui.json, terminal corner fonts or host themes."
        >
          <Button onClick={props.hostSettings}>Open host settings</Button>
        </Row>
      </Section>
      <Section
        title="Desktop presentation"
        footer="This placement is window-local. It never copies tasks, quotas or preferences into a second runtime."
      >
        <Row
          title="Placement"
          description="The mini-window stays inside the application and follows the current session. Narrow screens use the native drawer."
        >
          <Select
            label="Navigator placement"
            value={props.presentation()}
            options={[
              { value: 'panel', label: 'Native panel' },
              { value: 'floating', label: 'In-app mini-window' },
            ]}
            onChange={props.setPresentation}
          />
        </Row>
        <Row title="Mini-window position and size">
          <Button onClick={props.resetWindow}>Reset mini-window</Button>
        </Row>
      </Section>
    </>
  )
}
