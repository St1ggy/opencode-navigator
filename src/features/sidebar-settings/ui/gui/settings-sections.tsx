import { SECTION_DEFINITIONS } from '../../../../shared/config'
import { GuiSortableList } from '../../../../shared/ui/gui'

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
      <GuiSortableList
        ui={props.ui}
        label="Section order"
        items={preferences.selectedSectionOrder()}
        itemKey={(section) => section}
        itemLabel={(section) => SECTION_DEFINITIONS.find((value) => value.name === section)?.label ?? section}
        scope={preferences.selectedScopeKey()}
        move={(from, to) => preferences.reorderSelectedSection(from, to, preferences.selectedScopeKey())}
      >
        {(section, handle) => <GuiSectionSettingsRow {...props} section={section()} handle={handle} />}
      </GuiSortableList>
    </Section>
  )
}
