import { For } from 'solid-js'

import { GuiSectionSettingsRow } from './section-settings-row'

import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsSections(props: GuiSettingsServices) {
  const Section = props.ui.SettingsSection
  const preferences = props.preferences

  return (
    <Section
      title="Sections"
      footer="Visibility changes apply immediately. Save this layout as the scoped default to use it in future sessions."
    >
      <For each={preferences.selectedSectionOrder()}>
        {(section, index) => (
          <GuiSectionSettingsRow
            {...props}
            section={section}
            index={index()}
            count={preferences.selectedSectionOrder().length}
          />
        )}
      </For>
    </Section>
  )
}
