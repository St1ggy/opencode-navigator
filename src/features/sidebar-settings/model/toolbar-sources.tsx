import { QUICK_ACTIONS, quickActionDisabledReason, quickActionLabel } from '../../../entities/quick-action'
import { SelectionMenu } from '../../../shared/ui'

import { openToolbarPin } from './open-toolbar'

import type { ToolbarSettings } from './toolbar-settings'
import type { DialogNavigation } from '../../../shared/ui'

export function openToolbarSources(input: ToolbarSettings & { dialogs: DialogNavigation }, kind: 'action' | 'skill') {
  if (kind === 'action') {
    input.dialogs.open(() => (
      <SelectionMenu
        api={input.api}
        title="Pin Quick Action"
        height={18}
        options={QUICK_ACTIONS.map((action) => ({
          title: quickActionLabel(input.api, action),
          value: action.command,
          description: quickActionDisabledReason(input.api, action) ?? 'Choose icons before pinning',
        }))}
        onSelect={(option) =>
          openToolbarPin({
            ...input,
            pin: { kind: 'action', id: option.value as (typeof QUICK_ACTIONS)[number]['command'], icon: 'bolt' },
          })
        }
      />
    ))

    return
  }

  if (!input.skills) return

  const target = input.skills.target()

  input.dialogs.prompt({
    title: 'Find a Skill to pin',
    placeholder: 'Name or description',
    value: '',
    onConfirm(query) {
      const list = input
        .skills!.list(target)
        .filter((skill) => `${skill.name} ${skill.description ?? ''}`.toLowerCase().includes(query.toLowerCase()))

      input.dialogs.open(() => (
        <SelectionMenu
          api={input.api}
          title="Pin Skill"
          height={18}
          options={
            list.length > 0
              ? list.map((skill, index) => ({
                  title: skill.name,
                  value: String(index),
                  description: skill.location || 'Unavailable: host provides no source location',
                }))
              : [
                  {
                    title: 'No matching Skills',
                    value: 'empty',
                    description: input.skills!.error(target) ?? 'Try another query',
                  },
                ]
          }
          onSelect={(option) => {
            const skill = list[Number(option.value)]

            if (!skill?.location || input.skills!.target().key !== target.key) return

            openToolbarPin({
              ...input,
              pin: { kind: 'skill', location: skill.location, name: skill.name, icon: 'book' },
            })
          }}
        />
      ))
    },
  })
}
