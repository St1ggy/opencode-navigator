import { GuiSettingsLimits } from './settings-limits'
import { GuiSettingsRowIcon } from './settings-row-icon'

import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsBehavior(props: GuiSettingsServices) {
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const Select = props.ui.Select
  const Button = props.ui.Button
  const Switch = props.ui.Switch

  return (
    <>
      <GuiSettingsLimits ui={props.ui} preferences={props.preferences} />
      <Section title="Toolbar">
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
        <Row
          title={
            <GuiSettingsRowIcon ui={props.ui} icon="grid-plus">
              Toolbar pins
            </GuiSettingsRowIcon>
          }
          description="Pins and icon choices are private and shared across worktrees."
        >
          <Button icon="settings-gear" onClick={props.configureToolbar}>
            Configure toolbar
          </Button>
        </Row>
      </Section>
      <Section title="MCP">
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
      </Section>
      <Section
        title="OpenCode preferences"
        footer="Start in chat is available only in TUI. Desktop shortcuts, appearance and session permissions are managed by OpenCode."
      >
        <Row
          title="Session permissions"
          description="OpenCode owns Desktop permission defaults. This opens host Settings; it is not an instant auto-approve toggle."
        >
          <Button icon="settings-gear" onClick={props.hostSettings}>
            Open host permissions settings
          </Button>
        </Row>
        <Row
          title="Theme, fonts and keyboard shortcuts"
          description="Use OpenCode Desktop preferences. Navigator does not change cli.json, tui.json, terminal corner fonts or host themes."
        >
          <Button icon="settings-gear" onClick={props.hostSettings}>
            Open host settings
          </Button>
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
