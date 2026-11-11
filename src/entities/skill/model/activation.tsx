import { isAbortError } from '../../../shared/lib/request-state'
import { type DialogNavigation } from '../../../shared/ui'
import { SkillDialog } from '../ui/skill-dialog'

import { createSkillActivation } from './activation-model'

import type { SkillActivationAccess } from './activation-model'
import type { SkillController, SkillInfo } from './controller'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export { skillUnavailable } from './activation-model'
export type { SkillActivationAccess } from './activation-model'

export function activateSkill(input: {
  api: TuiPluginApi
  controller: SkillController
  access: SkillActivationAccess
  dialogs: DialogNavigation
  skill: SkillInfo
  beforeInsert?: () => void
  onConfigure?: (navigation: DialogNavigation) => void
}) {
  input = { ...input, skill: { ...input.skill } }
  const route = JSON.stringify(input.api.route.current)
  const activation = createSkillActivation({
    ...input,
    current: () => route === JSON.stringify(input.api.route.current),
  })
  const report = (error: unknown) => {
    if (!isAbortError(error))
      input.api.ui.toast({ variant: 'error', title: 'Skills', message: String(error), duration: 5000 })
  }

  async function insert(skip = false) {
    try {
      await activation.run(skip)
    } catch (error) {
      report(error)
    }
  }
  try {
    activation.check()
  } catch (error) {
    report(error)

    return
  }

  if (!activation.shouldConfirm()) {
    void insert()

    return
  }

  input.dialogs.open(() => (
    <SkillDialog
      api={input.api}
      skill={input.skill}
      favorite={input.access.isFavoriteSkill?.(input.skill) ?? false}
      favoriteDisabled={input.access.ready?.() === false}
      onToggleFavorite={() => input.access.toggleFavoriteSkill?.(input.skill)}
      onConfigure={input.onConfigure}
      onAccept={(skip) => {
        void insert(skip)
      }}
    />
  ))
}
