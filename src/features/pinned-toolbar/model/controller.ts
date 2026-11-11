import { toolbarPinIcons, toolbarPinKey } from '../../../entities/preferences/model'

import type { ToolbarPin } from '../../../entities/preferences/model'
import type { QuickActionId } from '../../../entities/quick-action/model'
import type { SkillInfo } from '../../../entities/skill/model'

export function createPinnedToolbarModel(ports: {
  pins(): readonly ToolbarPin[]
  action(id: QuickActionId): { label: string; state?: string; stateLabel?: string; reason?: string }
  skill(pin: Extract<ToolbarPin, { kind: 'skill' }>): { skill?: SkillInfo; reason?: string }
  runAction(id: QuickActionId): void
  runSkill(skill: SkillInfo): void
  unavailable(label: string, reason: string): void
}) {
  function view(pin: ToolbarPin) {
    const action = pin.kind === 'action' ? ports.action(pin.id) : undefined
    const skill = pin.kind === 'skill' ? ports.skill(pin) : undefined

    return {
      label: action?.label ?? (pin.kind === 'skill' ? pin.name : pin.id),
      stateLabel: action?.stateLabel,
      icons: toolbarPinIcons(pin, action?.state),
      text: pin.text,
      reason: action?.reason ?? skill?.reason,
    }
  }
  function run(key: string) {
    const pin = ports.pins().find((item) => toolbarPinKey(item) === key)

    if (!pin) return

    const item = view(pin)

    if (item.reason) {
      ports.unavailable(item.label, item.reason)

      return
    }

    if (pin.kind === 'action') {
      ports.runAction(pin.id)

      return
    }

    const skill = ports.skill(pin).skill

    if (skill) ports.runSkill(skill)
  }

  return { pins: ports.pins, view, run }
}

export type PinnedToolbarModel = ReturnType<typeof createPinnedToolbarModel>
