import { useDialogs } from '../../../shared/ui'
import { createSkillGroupsModel } from '../model/skill-groups'

import { GroupAssignmentDialog } from './group-assignment-dialog'
import { PresetMenu } from './preset-menu'

import type { PreferencesController } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SkillGroupsDialog(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  skills: SkillController
}) {
  const dialogs = useDialogs(props.api)
  const model = createSkillGroupsModel(props.skills, props.preferences)

  return (
    <PresetMenu
      api={props.api}
      title="Skill groups · user-wide"
      options={model.options()}
      onSelect={(option) => {
        if (option.value === '__retry__') {
          void model.retry().catch(() => {})

          return
        }

        if (option.value === '__empty__') return

        const location = option.value

        dialogs.open(() => (
          <GroupAssignmentDialog
            api={props.api}
            title={`Group for ${option.title}`}
            assigned={() => props.preferences.skillGroups?.()[location]}
            groups={() =>
              [...new Set(Object.values(props.preferences.skillGroups?.() ?? {}))].sort((a, b) => a.localeCompare(b))
            }
            onAssign={(group) => props.preferences.setSkillGroup?.(location, group)}
          />
        ))
      }}
    />
  )
}
