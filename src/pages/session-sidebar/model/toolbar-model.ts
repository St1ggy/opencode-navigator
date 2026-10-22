import { createEffect, createMemo, onCleanup, untrack } from 'solid-js'

import { toolbarPinKey } from '../../../entities/preferences'
import {
  QUICK_ACTIONS,
  createQuickActionRevision,
  quickActionDisabledReason,
  quickActionLabel,
  quickActionState,
  quickActionStates,
} from '../../../entities/quick-action'
import { activateSkill, skillUnavailable } from '../../../entities/skill'
import { createDialogStack, useIcons } from '../../../shared/ui'

import type { SidebarInteraction } from './sidebar-interaction'
import type { PreferencesController, ToolbarPin } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type ToolbarServices = {
  api: TuiPluginApi
  preferences: PreferencesController
  skills: SkillController
  interaction: SidebarInteraction
  onNewSession?: () => boolean
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
  function view(pin: ToolbarPin) {
    revision()

    if (pin.kind === 'action') {
      const action = QUICK_ACTIONS.find((item) => item.command === pin.id)!
      const state = quickActionState(props.api, pin.id)
      const stateLabel = quickActionStates(props.api, pin.id).find((item) => item.id === state)?.label

      return {
        label: quickActionLabel(props.api, action),
        stateLabel,
        icon: state ? (pin.stateIcons?.[state] ?? pin.icon) : pin.icon,
        reason: quickActionDisabledReason(props.api, action),
      }
    }

    const skill = props.skills.list(target()).find((item) => item.location === pin.location && item.name === pin.name)
    const request = props.skills.state(target())
    const unavailable = request.status === 'loading' ? 'Loading Skills' : 'Skill is unavailable in this workspace'

    return {
      label: pin.name,
      icon: pin.icon,
      stateLabel: undefined,
      reason: request.error?.message ?? (skill ? skillUnavailable(props.skills, skill) : unavailable),
    }
  }
  function run(key: string) {
    const pin = pins().find((item) => toolbarPinKey(item) === key)

    if (!pin) return

    const item = view(pin)

    if (item.reason) {
      props.api.ui.toast({ variant: 'warning', title: item.label, message: item.reason })

      return
    }

    if (pin.kind === 'action') {
      if (pin.id === 'session.new' && props.onNewSession?.()) return

      const result = props.interaction.dispatchFromReturnTarget(pin.id)

      if (!result.ok)
        props.api.ui.toast({ variant: 'warning', title: item.label, message: `Command is ${result.reason}` })

      return
    }

    const skill = props.skills
      .list(target())
      .find((candidate) => candidate.location === pin.location && candidate.name === pin.name)

    if (!skill) return

    const route = JSON.stringify(props.api.route.current)
    const dialogs = createDialogStack(
      props.api,
      icons.style,
      () => route === JSON.stringify(props.api.route.current),
      icons.multilineCorners,
    )

    activateSkill({ api: props.api, controller: props.skills, access: props.preferences, skill, dialogs })
  }

  return { pins, view, run }
}
