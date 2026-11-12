import { Show } from 'solid-js'

import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsResets(props: GuiSettingsServices & { section: 'layout' | 'behavior' | 'mcp' }) {
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const Button = props.ui.Button

  return (
    <Section
      title="Restore configured defaults"
      footer="Every reset needs confirmation and applies only to its described data. Host themes and client configuration are never changed."
    >
      <Show when={props.section === 'layout'}>
        <Row title="Layout" description="Restore configured visibility, expansion and order for the selected scope.">
          <Button onClick={() => void props.reset('layout')}>Restore layout</Button>
        </Row>
      </Show>
      <Show when={props.section === 'behavior'}>
        <Row
          title="Shared behavior"
          description="Restore all Navigator behavior defaults in this scope, including terminal-only settings shared with TUI instances."
        >
          <Button onClick={() => void props.reset('behavior')}>Restore shared behavior</Button>
        </Row>
      </Show>
      <Show when={props.section === 'mcp'}>
        <Row
          title="Remembered MCP states"
          description="Forget desired states in this scope without changing the current connections."
        >
          <Button onClick={() => void props.reset('mcp')}>Clear remembered MCP states</Button>
        </Row>
      </Show>
    </Section>
  )
}
