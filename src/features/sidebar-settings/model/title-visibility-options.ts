import { supportsTitleVisibility } from '../../../shared/lib/host-capabilities'

import type { PreferencesController } from '../../../entities/preferences'
import type { useIcons } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function titleVisibilityOptions(
  api: TuiPluginApi,
  preferences: PreferencesController,
  icons: ReturnType<typeof useIcons>,
) {
  if (!supportsTitleVisibility(api)) return []

  const title = preferences.selectedShowSessionTitle()
  const date = preferences.selectedShowSessionDate()

  return [
    {
      title: `${icons.icon(title ? 'checked' : 'unchecked')} Session title`,
      value: 'session_title',
      description: title ? 'visible' : 'hidden',
    },
    {
      title: `${icons.icon(date ? 'checked' : 'unchecked')} Creation date`,
      value: 'session_date',
      description: date ? 'visible' : 'hidden',
    },
  ]
}
