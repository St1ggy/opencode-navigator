import { SECTION_DEFINITIONS } from '../../../../shared/config'
import { GuiSortableList } from '../../../../shared/ui/gui'

import { GuiSectionSettingsRow } from './section-settings-row'

import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsSections(props: GuiSettingsServices) {
  const SettingsSection = props.ui.SettingsSection
  const preferences = props.preferences

  return (
    <SettingsSection title="Sections" footer="Visibility changes apply immediately.">
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
    </SettingsSection>
  )
}
