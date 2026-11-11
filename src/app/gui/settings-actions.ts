import { QUICK_ACTION_IDS } from '../../shared/config'

import { guiQuickActionLabel } from './adapters/quick-actions'
import { guiPreferenceSession } from './adapters/settings-session'

import type { PreferencesController } from '../../entities/preferences/model'
import type { GuiSettingsServices } from '../../features/sidebar-settings/gui'
import type { MonitoringRegistry } from './monitoring-registry'
import type { Context } from '@opencode/plugin/gui'

const resets = {
  layout: {
    title: 'Restore configured layout?',
    description: 'Clear saved and temporary layout overrides in the selected scope.',
  },
  behavior: {
    title: 'Restore shared Navigator behavior?',
    description:
      'Clear all behavior overrides in this scope, including settings shared with TUI instances. Host themes and client configuration stay unchanged.',
  },
  mcp: {
    title: 'Clear remembered MCP states?',
    description: 'Forget desired states in this scope. Existing connections are not changed.',
  },
  trust: {
    title: 'Require Skill confirmation everywhere?',
    description: 'Revoke all private user-wide Skill trust decisions. No Skill is run or removed.',
  },
}

export function createGuiSettingsActions(
  context: Context,
  preferences: PreferencesController,
  registry: MonitoringRegistry,
): Pick<GuiSettingsServices, 'catalogs' | 'reset'> {
  const actions = new Map(QUICK_ACTION_IDS.map((id) => [id, { id, label: guiQuickActionLabel(id) }]))
  let resetting = false
  const target = () => {
    const session = guiPreferenceSession(context)

    return JSON.stringify([preferences.selectedScopeKey(), session?.id, session?.server.id, session?.location])
  }

  return {
    catalogs: {
      skills: () => registry.active()?.catalogs?.skills.list() ?? [],
      mcpServers: () =>
        [
          ...new Set([
            ...(registry
              .active()
              ?.catalogs?.mcp.list()
              .map((item) => item.name) ?? []),
            ...Object.keys(preferences.mcpServerGroups()),
          ]),
        ].sort(),
      actions: () => preferences.selectedQuickActionOrder().map((id) => actions.get(id)!),
    },
    async reset(kind) {
      if (resetting || !preferences.ready()) return

      resetting = true
      const selected = target()

      try {
        const confirmed = await context.dialogs.confirm({
          ...resets[kind],
          confirm: 'Reset',
          cancel: 'Cancel',
          danger: true,
        })

        if (!confirmed) return

        if (context.signal.aborted || target() !== selected)
          throw new Error('Preference scope or session changed. Review the reset again.')

        const apply = {
          layout: preferences.resetSections,
          behavior: preferences.resetPluginSettings,
          mcp: preferences.resetMcpStates,
          trust: preferences.resetSkillConfirmations,
        }

        apply[kind]()
        await preferences.flush()
        context.toast.show({ title: 'Navigator preferences reset', variant: 'success' })
      } catch (error) {
        context.toast.show({
          title: error instanceof Error ? error.message : 'Could not reset preferences. Try again.',
          variant: 'error',
        })
      } finally {
        resetting = false
      }
    },
  }
}
