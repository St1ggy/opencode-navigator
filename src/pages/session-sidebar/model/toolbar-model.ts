import { createEffect, createMemo, onCleanup, untrack } from 'solid-js'

import { toolbarPinIcons } from '../../../entities/preferences'
import {
  QUICK_ACTIONS,
  createQuickActionRevision,
  quickActionDisabledReason,
  quickActionLabel,
  quickActionState,
  quickActionStates,
} from '../../../entities/quick-action'
import { activateSkill, skillUnavailable } from '../../../entities/skill'
import { createPinnedToolbarModel } from '../../../features/pinned-toolbar/model'
import { createDialogStack, useIcons } from '../../../shared/ui'

import type { PreferencesController, ToolbarPin } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'
import type { SidebarInteraction } from './sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type ToolbarServices = {
  api: TuiPluginApi
  preferences: PreferencesController
  skills: SkillController
  interaction: SidebarInteraction
  onNewSession?: () => boolean
}

function toolbarPinWidth(pin: ToolbarPin) {
  const states = Object.keys({ ...pin.stateIcons, ...pin.stateIconLists })
  const count = Math.max(toolbarPinIcons(pin).length, ...states.map((state) => toolbarPinIcons(pin, state).length))
  const iconsWidth = Math.max(0, count * 2 - 1)

  return 2 + Math.max(1, iconsWidth + (count && pin.text ? 1 : 0) + Bun.stringWidth(pin.text ?? ''))
}

export function createToolbarModel(props: ToolbarServices) {
  const icons = useIcons()
  const revision = createQuickActionRevision(props.api)
  const pins = () => props.preferences.toolbarPins?.() ?? []
  const needsSkills = createMemo(() => pins().some((pin) => pin.kind === 'skill'))
  const target = createMemo(() => props.skills.target())

  createEffect(() => {
    if (!needsSkills()) return

    const current = target()
    const release = untrack(() => props.skills.activate(current))

    onCleanup(release)
    untrack(() => {
      void props.skills.refresh(current).catch(() => {})
    })
  })
  const model = createPinnedToolbarModel({
    pins,
    action(id) {
      revision()
      const action = QUICK_ACTIONS.find((item) => item.command === id)!
      const state = quickActionState(props.api, id)

      return {
        label: quickActionLabel(props.api, action),
        state,
        stateLabel: quickActionStates(props.api, id).find((item) => item.id === state)?.label,
        reason: quickActionDisabledReason(props.api, action),
      }
    },
    skill(pin) {
      const skill = props.skills.list(target()).find((item) => item.location === pin.location && item.name === pin.name)
      const request = props.skills.state(target())
      const unavailable = request.status === 'loading' ? 'Loading Skills' : 'Skill is unavailable in this workspace'

      return { skill, reason: request.error?.message ?? (skill ? skillUnavailable(props.skills, skill) : unavailable) }
    },
    unavailable: (title, message) => props.api.ui.toast({ variant: 'warning', title, message }),
    runAction(id) {
      if (id === 'session.new' && props.onNewSession?.()) return

      const result = props.interaction.dispatchFromReturnTarget(id)

      if (!result.ok)
        props.api.ui.toast({
          variant: 'warning',
          title: quickActionLabel(
            props.api,
            QUICK_ACTIONS.find((item) => item.command === id)!,
          ),
          message: `Command is ${result.reason}`,
        })
    },
    runSkill(skill) {
      const route = JSON.stringify(props.api.route.current)
      const dialogs = createDialogStack(
        props.api,
        icons.style,
        () => route === JSON.stringify(props.api.route.current),
        icons.multilineCorners,
      )

      activateSkill({ api: props.api, controller: props.skills, access: props.preferences, skill, dialogs })
    },
  })

  return { ...model, width: toolbarPinWidth }
}
