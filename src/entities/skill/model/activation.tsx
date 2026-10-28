import { isAbortError } from '../../../shared/lib/request-state'
import { type DialogNavigation } from '../../../shared/ui'
import { SkillDialog } from '../ui/skill-dialog'

import type { SkillController, SkillInfo } from './controller'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type SkillActivationAccess = {
  shouldConfirmSkill(skill: SkillInfo): boolean
  skipSkillConfirmation(skill: SkillInfo): void
  recordSkillUse?(skill: SkillInfo): Promise<void>
  isFavoriteSkill?(skill: SkillInfo): boolean
  toggleFavoriteSkill?(skill: SkillInfo): void
  ready?(): boolean
}

export function skillUnavailable(controller: SkillController, skill: SkillInfo): string | undefined {
  const list = controller.list()

  if (list.every((item) => !(item.name === skill.name && item.location === skill.location)))
    return 'Skill is unavailable in this workspace'

  if (skill.id) {
    if (list.every((item) => item.id !== skill.id || item.location !== skill.location)) return 'Skill source changed'
  } else if (list.filter((item) => item.name === skill.name).length !== 1)
    return 'Multiple sources share this skill name'

  return undefined
}

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
  const target = input.controller.target()
  const route = JSON.stringify(input.api.route.current)
  const current = () =>
    target.key === input.controller.target().key && route === JSON.stringify(input.api.route.current)
  const report = (error: unknown) => {
    if (!isAbortError(error))
      input.api.ui.toast({ variant: 'error', title: 'Skills', message: String(error), duration: 5000 })
  }

  function check() {
    if (!current()) throw new DOMException('Skill target changed; choose it again', 'AbortError')

    const reason = skillUnavailable(input.controller, input.skill)

    if (reason) throw new Error(reason)
  }
  async function insert(skip = false) {
    try {
      check()

      if (skip) input.access.skipSkillConfirmation(input.skill)

      input.beforeInsert?.()

      if (await input.controller.use(target, input.skill.name, input.skill))
        await input.access.recordSkillUse?.(input.skill)
    } catch (error) {
      report(error)
    }
  }
  try {
    check()
  } catch (error) {
    report(error)

    return
  }

  if (!input.access.shouldConfirmSkill(input.skill)) {
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
