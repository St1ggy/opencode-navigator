import { For, Show, createSignal } from 'solid-js'

import { GuiPresetControls } from './preset-controls'

import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsPresets(props: GuiSettingsServices) {
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const Button = props.ui.Button
  const TextInput = props.ui.TextInput
  const Select = props.ui.Select
  const [name, setName] = createSignal('')
  const [message, setMessage] = createSignal('')

  async function save(mcp: boolean) {
    try {
      if (mcp) await props.presets.saveMcp(name())
      else props.preferences.saveLayoutPreset(name())

      setName('')
      setMessage('Preset saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this preset.')
    }
  }

  return (
    <Section
      title="Presets and portable settings"
      footer={
        <Show when={message()}>
          <p role="status">{message()}</p>
        </Show>
      }
    >
      <Row
        title="Save current layout or MCP states"
        description="Named presets are private and shared across worktrees."
      >
        <div style={{ display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }}>
          <TextInput label="New preset name" value={name()} onInput={setName} />
          <Button disabled={!name().trim()} onClick={() => void save(false)}>
            Save layout preset
          </Button>
          <Button disabled={!name().trim()} onClick={() => void save(true)}>
            Save MCP preset
          </Button>
        </div>
      </Row>
      <For each={Object.keys(props.preferences.layoutPresets()).sort()}>
        {(preset) => (
          <Row title={preset} description="Layout preset. Preview before applying.">
            <Select
              label={`Linked MCP preset for ${preset}`}
              value={props.preferences.workspaceProfiles()[preset] ?? ''}
              options={[
                { value: '', label: 'No linked MCP preset' },
                ...Object.keys(props.preferences.mcpPresets())
                  .sort()
                  .map((presetName) => ({ value: presetName, label: presetName })),
              ]}
              onChange={(presetName) => props.preferences.linkWorkspaceProfile(preset, presetName || undefined)}
            />
            <Button onClick={() => props.presets.layout(preset)}>Preview layout</Button>
            <GuiPresetControls ui={props.ui} presets={props.presets} kind="layout" name={preset} />
          </Row>
        )}
      </For>
      <Row title="MCP presets" description="Preview connections, disconnections, unchanged and skipped servers.">
        <Button onClick={props.presets.mcp}>Browse MCP presets</Button>
      </Row>
      <For each={Object.keys(props.preferences.mcpPresets()).sort()}>
        {(preset) => (
          <Row title={preset} description="MCP preset. Changes do not connect or disconnect servers.">
            <GuiPresetControls ui={props.ui} presets={props.presets} kind="mcp" name={preset} />
          </Row>
        )}
      </For>
      <Row
        title="Project-local profile"
        description="Preview a commit-safe named profile in .opencode/navigator.json on the selected server. No private preferences are exported."
      >
        <Button onClick={props.presets.project}>Save project profile…</Button>
      </Row>
      <Row
        title="Portable JSON"
        description="Export the selected scope or validate and preview pasted settings before applying."
      >
        <Button onClick={() => void props.presets.export()}>Copy portable settings</Button>
        <Button onClick={props.presets.import}>Import settings</Button>
      </Row>
    </Section>
  )
}
