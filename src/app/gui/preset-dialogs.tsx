import { GuiLayoutPresetPreview, GuiPortableSettingsDialog } from '../../features/sidebar-settings/gui'
import { createWorkspacePresetPreview } from '../../features/sidebar-settings/model'

import { guiPreferenceSession } from './adapters/settings-session'
import { createGuiPresetManagement } from './preset-management'
import { createGuiProjectProfileDialog } from './project-profile-dialog'

import type { PreferencesController } from '../../entities/preferences/model'
import type { GuiSettingsServices } from '../../features/sidebar-settings/gui'
import type { MonitoringRegistry } from './monitoring-registry'
import type { Context } from '@opencode/plugin/gui'

export function createGuiPresetDialogs(
  context: Context,
  preferences: PreferencesController,
  registry: MonitoringRegistry,
  mcp: () => void,
): GuiSettingsServices['presets'] {
  const target = () => {
    const session = guiPreferenceSession(context)

    return JSON.stringify([preferences.selectedScopeKey(), session?.server.id, session?.id, session?.location])
  }

  return {
    mcp,
    manage: createGuiPresetManagement(context, preferences, registry),
    project: createGuiProjectProfileDialog(context, preferences),
    layout(name) {
      const scope = target()

      context.dialogs.open((dialog) => (
        <GuiLayoutPresetPreview
          ui={context.ui}
          name={name}
          model={createWorkspacePresetPreview(
            preferences,
            name,
            registry.active()?.catalogs?.mcp,
            () => !context.signal.aborted && target() === scope,
          )}
          current={() => !context.signal.aborted && target() === scope}
          close={dialog.close}
        />
      ))
    },
    async saveMcp(name) {
      const catalogs = registry.active()?.catalogs

      if (!catalogs || catalogs.mcp.mutating() || catalogs.mcp.state().status !== 'ready')
        throw new Error('Refresh MCP and wait for current operations before saving a preset.')

      preferences.saveMcpPreset(name, catalogs.mcp.capturePreset())
      await preferences.flush()
    },
    async export() {
      await context.system.copy(preferences.exportPortableSettings())
      context.toast.show({ title: 'Portable settings copied', variant: 'success' })
    },
    import() {
      const scope = target()

      context.dialogs.open((dialog) => (
        <GuiPortableSettingsDialog
          ui={context.ui}
          preferences={preferences}
          current={() => !context.signal.aborted && target() === scope}
          close={dialog.close}
        />
      ))
    },
  }
}
