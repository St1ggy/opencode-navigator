import { GuiSkillDialog } from '../../entities/skill/gui'
import { createSkillActivation, skillUnavailable } from '../../entities/skill/model'
import { isAbortError } from '../../shared/lib/request-state'

import { createSelectedSessionAccess } from './adapters/selected-session'

import type { PreferencesController } from '../../entities/preferences/model'
import type { SkillInfo } from '../../entities/skill/model'
import type { MonitoringRuntime } from '../../pages/navigator/model'
import type { Context } from '@opencode/plugin/gui'

export function createGuiSkillDialogs(
  context: Context,
  runtime: () => MonitoringRuntime | undefined,
  preferences: PreferencesController,
) {
  const access = createSelectedSessionAccess(() => context.sessions.current())

  return {
    open(skill: SkillInfo, onUsed?: () => void) {
      const scope = access.capture()
      const controller = runtime()?.catalogs?.skills

      if (!scope || !controller) return

      const activation = createSkillActivation({
        controller,
        skill,
        access: preferences,
        current: () => access.current(scope),
      })
      const reason = () =>
        access.current(scope) ? skillUnavailable(controller, activation.skill) : 'Session or server changed'

      async function run(skip = false) {
        const inserted = await activation.run(skip)

        if (inserted) onUsed?.()

        return inserted
      }
      function report(error: unknown) {
        if (!isAbortError(error))
          context.toast.show({
            title: 'Skills',
            description: error instanceof Error ? error.message : 'Could not add Skill.',
            variant: 'error',
          })
      }

      try {
        activation.check()
      } catch (error) {
        report(error)

        return
      }

      if (!activation.shouldConfirm()) {
        void run().catch(report)

        return
      }

      context.dialogs.open((dialog) => (
        <GuiSkillDialog
          ui={context.ui}
          skill={activation.skill}
          reason={reason()}
          ready={preferences.ready()}
          favorite={preferences.isFavoriteSkill(activation.skill)}
          toggleFavorite={() => preferences.toggleFavoriteSkill(activation.skill)}
          use={run}
          close={dialog.close}
        />
      ))
    },
  }
}
