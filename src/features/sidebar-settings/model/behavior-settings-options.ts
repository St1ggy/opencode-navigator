import { DEFAULT_SEARCH_KEY } from '../../../shared/config'
import { supportsPermissionMode } from '../../../shared/lib/host-capabilities'

import type { SettingsOption } from './settings-groups'
import type { PreferencesController } from '../../../entities/preferences'
import type { useIcons } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function behaviorSettingsOptions(
  api: TuiPluginApi,
  preferences: PreferencesController,
  icons: ReturnType<typeof useIcons>,
): SettingsOption[] {
  const permission = preferences.autoApprovePermissions()
  const permissionDescription = permission ? 'on for new sessions' : 'off for new sessions'

  return [
    ...(supportsPermissionMode(api)
      ? [
          {
            title: `${icons.icon(permission === true ? 'checked' : 'unchecked')} Default auto-approve permissions`,
            value: 'auto_approve_permissions',
            description: permission === undefined ? 'follow OpenCode startup mode' : permissionDescription,
          },
        ]
      : []),
    {
      title: `${icons.icon(preferences.selectedStartInChat() ? 'checked' : 'unchecked')} Start new sessions in chat`,
      value: 'start_in_chat',
      description: preferences.selectedStartInChat() ? 'skip Home · on' : 'show Home · off',
    },
    {
      title: `${icons.icon(preferences.selectedPersistMcp() ? 'checked' : 'unchecked')} Remember MCP states`,
      value: 'persist_mcp',
      description: preferences.selectedPersistMcp() ? 'on' : 'off',
    },
    {
      title: `${icons.icon('settings')} Icon style`,
      value: 'lsp_icon_style',
      description: preferences.selectedLspIconStyle() === 'nerd' ? 'Nerd Font' : 'Text fallback',
    },
    {
      title: `${icons.icon(preferences.selectedCornerFont() ? 'checked' : 'unchecked')} Multiline corner font`,
      value: 'corner_font',
      description: preferences.selectedCornerFont() ? 'Installed' : 'Not installed · rectangular highlights',
    },
    {
      title: `${icons.icon('sections')} Row density`,
      value: 'row_density',
      description: preferences.selectedRowDensity() === 'compact' ? 'Compact' : 'Comfortable',
    },
    {
      title: `${icons.icon('sections')} Sidebar shortcut`,
      value: 'toggle_key',
      description: preferences.selectedToggleKey(),
    },
    {
      title: `${icons.icon('selected')} Focus shortcut`,
      value: 'focus_key',
      description: preferences.selectedFocusKey(),
    },
    {
      title: `${icons.icon('search')} Search Everything shortcut`,
      value: 'search_key',
      description: preferences.selectedSearchKey?.() ?? DEFAULT_SEARCH_KEY,
    },
    {
      title: `${icons.icon('retry')} Limits refresh interval`,
      value: 'limits_refresh',
      description: `${preferences.selectedLimitsRefreshMinutes()} min · minimum 1 min`,
    },
  ]
}
