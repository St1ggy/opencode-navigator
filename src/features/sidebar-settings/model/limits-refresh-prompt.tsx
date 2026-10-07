import type { PreferencesController } from '../../../entities/preferences'
import type { DialogNavigation } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function openLimitsRefreshPrompt(
  api: TuiPluginApi,
  preferences: PreferencesController,
  dialogs: DialogNavigation,
) {
  const scope = preferences.preferenceScopeLabel()

  dialogs.prompt({
    title: 'Limits refresh interval',
    description: () => (
      <text fg={api.theme.current.textMuted}>
        Automatic refresh in minutes (minimum 1; default 5). Manual Refresh stays immediate.
      </text>
    ),
    value: String(preferences.selectedLimitsRefreshMinutes()),
    onConfirm(value) {
      if (preferences.preferenceScopeLabel() !== scope) throw new Error('Preference scope changed; reopen this setting')

      if (!/^\d+$/.test(value.trim())) throw new Error('Enter whole minutes (at least 1 minute)')

      preferences.setLimitsRefreshMinutes(Number(value))
      dialogs.back()
    },
  })
}
