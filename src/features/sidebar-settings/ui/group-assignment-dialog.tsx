import { useDialogs } from '../../../shared/ui'

import { PresetMenu } from './preset-menu'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function GroupAssignmentDialog(props: {
  api: TuiPluginApi
  title: string
  assigned: () => string | undefined
  groups: () => readonly string[]
  onAssign: (group?: string) => void
}) {
  const dialogs = useDialogs(props.api)
  const options = () => [
    ...props.groups().map((group) => ({
      title: group,
      value: `:${group}`,
      description: group === props.assigned() ? 'Current' : 'Existing group',
    })),
    { title: 'Create new group', value: '+', description: 'Type a name' },
    { title: 'Ungrouped', value: ':', description: props.assigned() ? 'Remove assignment' : 'No group' },
  ]

  return (
    <PresetMenu
      api={props.api}
      title={props.title}
      options={options()}
      onSelect={(option) => {
        if (option.value !== '+') {
          props.onAssign(option.value.slice(1) || undefined)
          dialogs.back()

          return
        }

        dialogs.prompt({
          title: props.title,
          value: '',
          onConfirm(value) {
            if (!value.trim()) throw new Error('Group name is required')

            props.onAssign(value)
            dialogs.back()
            dialogs.back()
          },
        })
      }}
    />
  )
}
