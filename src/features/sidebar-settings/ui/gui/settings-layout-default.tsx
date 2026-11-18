import type { GuiSettingsAction } from './settings-action'
import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsLayoutDefault(
  props: Pick<GuiSettingsServices, 'ui' | 'preferences'> & { action: GuiSettingsAction },
) {
  const { Button, SettingsSection, SettingsRow } = props.ui

  return (
    <SettingsSection title="Layout default">
      <SettingsRow
        title="Use this layout in future sessions"
        description="The saved default changes only when you save it."
      >
        <Button
          icon="check"
          busy={props.action.busy()}
          onClick={() =>
            void props.action.run(props.preferences.saveLayoutAsDefault, 'Layout default saved for this scope.')
          }
        >
          Save layout as default
        </Button>
      </SettingsRow>
    </SettingsSection>
  )
}
