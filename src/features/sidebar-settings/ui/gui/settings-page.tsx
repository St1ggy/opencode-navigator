import { Show, createSignal } from 'solid-js'

import { GuiSettingsSurface } from '../../../../shared/ui/gui'

import { GuiSettingsAbout } from './settings-about'
import { GuiSettingsBehavior } from './settings-behavior'
import { GuiSettingsCatalogs } from './settings-catalogs'
import { GuiSettingsPresets } from './settings-presets'
import { GuiSettingsResets } from './settings-resets'
import { GuiSettingsSections } from './settings-sections'

import type { GuiSettingsServices } from './settings-contract'

export function GuiNavigatorSettings(props: GuiSettingsServices) {
  const Layout = props.ui.SettingsLayout
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const Select = props.ui.Select
  const Button = props.ui.Button
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal('')

  async function run(action: () => Promise<unknown>, message: string) {
    if (busy()) return

    setBusy(true)
    setStatus('')
    try {
      await action()
      setStatus(message)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Settings could not be saved. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout title="Navigator" description="Shared sidebar settings for this Desktop and your local TUI instances.">
      <GuiSettingsSurface>
        <Show when={props.preferences.ready()} fallback={<p role="status">Loading Navigator preferences…</p>}>
          <Section
            title="Preference scope"
            footer={
              <Show when={status()}>
                <p role="status">{status()}</p>
              </Show>
            }
          >
            <Row
              title="Scope"
              description="Global applies everywhere. Worktree overrides use the currently selected server and location."
            >
              <Select
                label="Navigator preference scope"
                value={props.preferences.preferenceScope()}
                options={[
                  { value: 'global', label: 'Global' },
                  ...(props.preferences.canUseWorktreeScope()
                    ? [{ value: 'worktree' as const, label: 'Worktree' }]
                    : []),
                ]}
                onChange={props.preferences.setPreferenceScope}
              />
            </Row>
            <Row
              title="Layout default"
              description="Changing section visibility or order does not implicitly replace the saved default."
            >
              <Button
                busy={busy()}
                onClick={() => void run(props.preferences.saveLayoutAsDefault, 'Layout default saved for this scope.')}
              >
                Save layout as default
              </Button>
            </Row>
            <Row
              title="Reload private preferences"
              description="Flush local writes, then load changes from other Navigator instances. Temporary layout overrides are cleared."
            >
              <Button
                busy={busy()}
                onClick={() => void run(props.preferences.reloadFromFile, 'Private preferences reloaded.')}
              >
                Reload preferences
              </Button>
            </Row>
          </Section>
          <GuiSettingsSections {...props} />
          <GuiSettingsBehavior {...props} />
          <GuiSettingsPresets {...props} />
          <GuiSettingsCatalogs {...props} />
          <GuiSettingsResets {...props} />
          <GuiSettingsAbout ui={props.ui} about={props.about} showGuide={props.showGuide} />
        </Show>
      </GuiSettingsSurface>
    </Layout>
  )
}
