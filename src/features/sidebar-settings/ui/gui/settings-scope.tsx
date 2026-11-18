import { Show } from 'solid-js'

import type { GuiSettingsAction } from './settings-action'
import type { GuiSettingsServices } from './settings-contract'

export function GuiSettingsHeaderActions(
  props: Pick<GuiSettingsServices, 'ui' | 'preferences'> & { scoped: boolean; action: GuiSettingsAction },
) {
  const { IconButton, Select, Tooltip } = props.ui

  return (
    <div style={{ display: 'flex', gap: '8px', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
      <Show when={props.scoped}>
        <Select
          label="Navigator preference scope"
          value={props.preferences.preferenceScope()}
          options={[
            { value: 'global', label: 'Global' },
            ...(props.preferences.canUseWorktreeScope() ? [{ value: 'worktree' as const, label: 'Worktree' }] : []),
          ]}
          onChange={props.preferences.setPreferenceScope}
        />
      </Show>
      <Tooltip value="Reload private preferences and clear temporary layout overrides">
        <IconButton
          icon="refresh"
          label="Reload preferences"
          busy={props.action.busy()}
          onClick={() => void props.action.run(props.preferences.reloadFromFile, 'Private preferences reloaded.')}
        />
      </Tooltip>
    </div>
  )
}
