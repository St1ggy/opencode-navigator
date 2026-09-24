import { useDialogs } from '../../../shared/ui'

import { PresetMenu } from './preset-menu'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpGroupAssignmentDialog(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  server: string
}) {
  const dialogs = useDialogs(props.api)
  const options = () => {
    const assigned = props.preferences.mcpServerGroups?.()[props.server]
    const groups = [...new Set(Object.values(props.preferences.mcpServerGroups?.() ?? {}))].sort((a, b) =>
      a.localeCompare(b),
    )

    return [
      ...groups.map((group) => ({
        title: group,
        value: `:${group}`,
        description: group === assigned ? 'Current' : 'Existing group',
      })),
      { title: 'Create new group', value: '+', description: 'Type a name' },
      { title: 'Ungrouped', value: ':', description: assigned ? 'Remove assignment' : 'No group' },
    ]
  }

  return (
    <PresetMenu
      api={props.api}
      title={`Group for ${props.server}`}
      options={options()}
      onSelect={(option) => {
        if (option.value !== '+') {
          props.preferences.setMcpServerGroup?.(props.server, option.value.slice(1) || undefined)
          dialogs.back()

          return
        }

        dialogs.prompt({
          title: `New group for ${props.server}`,
          value: '',
          onConfirm(value) {
            if (!value.trim()) throw new Error('Group name is required')

            props.preferences.setMcpServerGroup?.(props.server, value)
            dialogs.back()
            dialogs.back()
          },
        })
      }}
    />
  )
}
