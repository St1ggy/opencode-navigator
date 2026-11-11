import type { SkillController } from './skill-controller'
import type { SkillInfo } from './types'

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

export function createSkillActivation(input: {
  controller: SkillController
  access: SkillActivationAccess
  skill: SkillInfo
  current(): boolean
  beforeInsert?(): void
}) {
  const skill = { ...input.skill }
  const target = input.controller.target()

  function check() {
    if (!input.current() || target.key !== input.controller.target().key)
      throw new DOMException('Skill target changed; choose it again', 'AbortError')

    const reason = skillUnavailable(input.controller, skill)

    if (reason) throw new Error(reason)
  }

  return {
    skill,
    check,
    shouldConfirm: () => input.access.shouldConfirmSkill(skill),
    async run(skip = false) {
      check()

      if (skip) input.access.skipSkillConfirmation(skill)

      input.beforeInsert?.()

      const inserted = await input.controller.use(target, skill.name, skill)

      if (inserted) await input.access.recordSkillUse?.(skill)

      return inserted
    },
  }
}
