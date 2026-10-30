import {
  IconPicker,
  SelectionMenu,
  terminalIcon,
  terminalIconLabel,
  useDialogState,
  useDialogs,
  useIcons,
} from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ToolbarIconGroupDialog(props: {
  api: TuiPluginApi
  title: string
  initial: readonly string[]
  onConfirm(value: readonly string[]): void
}) {
  const dialogs = useDialogs(props.api)
  const icons = useIcons()
  const [values, setValues] = useDialogState('icon-group', [...props.initial])

  function choose(index: number) {
    dialogs.open(
      () => (
        <IconPicker
          api={props.api}
          value={values()[index] ?? 'bolt'}
          onSelect={(id) => {
            setValues((current) => {
              const next = [...current]

              next[index] = id

              return next
            })
            dialogs.back()
          }}
        />
      ),
      'large',
    )
  }

  return (
    <SelectionMenu
      api={props.api}
      title={props.title}
      adaptive
      height={18}
      options={[
        ...values().map((id, index) => ({
          title: `${terminalIcon(id, icons.style())} Icon ${index + 1}`,
          value: `edit:${index}`,
          description: terminalIconLabel(id),
          icon: 'edit' as const,
        })),
        ...(values().length < 3
          ? [
              {
                title: 'Add icon…',
                value: 'add',
                description: `${values().length} of 3 icons selected`,
                icon: 'add' as const,
              },
            ]
          : []),
        {
          title: 'Use these icons',
          value: 'apply',
          description: values().length > 0 ? 'Return to the unsaved button draft' : 'Text-only appearance',
          icon: 'save',
        },
        ...values().map((_id, index) => ({
          title: `Remove icon ${index + 1}`,
          value: `remove:${index}`,
          description: 'Keep the remaining icons in order',
          icon: 'delete' as const,
        })),
        { title: 'Cancel', value: 'cancel', description: 'Discard this icon-group draft', icon: 'close' },
      ]}
      onSelect={(option) => {
        if (option.value === 'add') choose(values().length)
        else if (option.value.startsWith('edit:')) choose(Number(option.value.slice(5)))
        else if (option.value.startsWith('remove:'))
          setValues((current) => current.filter((_, index) => index !== Number(option.value.slice(7))))
        else {
          if (option.value === 'apply') props.onConfirm(values())

          dialogs.back()
        }
      }}
    />
  )
}
