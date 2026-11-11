import { skillUnavailable } from '../../entities/skill/model'
import { createPinnedToolbarModel } from '../../features/pinned-toolbar/model'

import { guiQuickActionLabel } from './adapters/quick-actions'
import { createGuiNotifications } from './notifications'

import type { PreferencesController } from '../../entities/preferences/model'
import type { MonitoringRegistry } from './monitoring-registry'
import type { createGuiSkillDialogs } from './skill-dialogs'
import type { Context } from '@opencode/plugin/gui'

export function createGuiToolbarModel(
  context: Context,
  registry: MonitoringRegistry,
  preferences: PreferencesController,
  skills: ReturnType<typeof createGuiSkillDialogs>,
) {
  const notifications = createGuiNotifications(context)

  return createPinnedToolbarModel({
    pins: preferences.toolbarPins,
    action(id) {
      const state = registry.active()?.catalogs?.actionState(id)

      return {
        label: state?.label ?? guiQuickActionLabel(id),
        reason: state?.reason ?? (state ? undefined : 'Open a session first'),
      }
    },
    skill(pin) {
      const controller = registry.active()?.catalogs?.skills
      const skill = controller?.list().find((item) => item.location === pin.location && item.name === pin.name)

      return {
        skill,
        reason:
          controller?.error() ??
          (controller && skill ? skillUnavailable(controller, skill) : 'Skill is unavailable in this workspace'),
      }
    },
    runAction(id) {
      const catalogs = registry.active()?.catalogs

      if (catalogs)
        void catalogs.runAction(id).catch((error: unknown) =>
          notifications.show({
            title: 'Toolbar',
            variant: 'error',
            message: error instanceof Error ? error.message : 'Could not dispatch this action.',
          }),
        )
    },
    runSkill: (skill) => skills.open(skill),
    unavailable: (title, message) => notifications.show({ title, message, variant: 'warning' }),
  })
}
