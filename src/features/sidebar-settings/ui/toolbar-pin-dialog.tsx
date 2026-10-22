import { toolbarPinKey } from '../../../entities/preferences'
import { quickActionStates } from '../../../entities/quick-action'
import { IconPicker, SelectionMenu, terminalIcon, useDialogState, useDialogs, useIcons } from '../../../shared/ui'

import type { ToolbarPinSettings } from '../model/toolbar-settings'

export function ToolbarPinDialog(props: ToolbarPinSettings & { expected?: string }) {
  const dialogs = useDialogs(props.api)
  const icons = useIcons()
  const [icon, setIcon] = useDialogState('pin-icon', props.pin.icon)
  const [states, setStates] = useDialogState<Record<string, string>>('pin-states', { ...props.pin.stateIcons })
  const [sourceRoute] = useDialogState('pin-route', JSON.stringify(props.api.route.current))
  const [sourceTarget] = useDialogState('pin-target', props.skills?.target().key)
  const existing = () => props.preferences.toolbarPins().find((pin) => toolbarPinKey(pin) === toolbarPinKey(props.pin))

  function choose(state?: string) {
    dialogs.open(
      () => (
        <IconPicker
          api={props.api}
          value={state ? (states()[state] ?? icon()) : icon()}
          onSelect={(id) => {
            if (state) setStates((value) => ({ ...value, [state]: id }))
            else setIcon(id)

            dialogs.back()
          }}
        />
      ),
      'large',
    )
  }
  function save() {
    try {
      if (sourceRoute() !== JSON.stringify(props.api.route.current) || sourceTarget() !== props.skills?.target().key)
        throw new Error('Workspace or session changed; reopen pin configuration')

      const source = props.pin.kind === 'skill' ? props.pin.location : undefined

      if (!props.expected && source && !props.skills?.list().some((skill) => skill.location === source))
        throw new Error('Skill source changed; choose it again')

      const pin = { ...props.pin, icon: icon(), stateIcons: states() }

      props.preferences.changeToolbarPin(
        props.expected
          ? {
              operation: 'configure',
              key: toolbarPinKey(pin),
              icon: pin.icon,
              stateIcons: pin.stateIcons,
              expected: props.expected,
            }
          : { operation: 'pin', pin },
      )
      dialogs.back()
    } catch (error) {
      props.api.ui.toast({ variant: 'error', title: 'Toolbar', message: String(error) })
    }
  }

  return (
    <SelectionMenu
      adaptive
      api={props.api}
      title={props.pin.kind === 'skill' ? `Pin Skill · ${props.pin.name}` : 'Pin Quick Action'}
      height={16}
      options={[
        {
          title: `${terminalIcon(icon(), icons.style())} Base icon`,
          value: 'base',
          description: 'Used when the state is unavailable or has no custom icon',
          icon: 'edit',
        },
        ...(props.pin.kind === 'action'
          ? quickActionStates(props.api, props.pin.id).map((state) => ({
              title: `${terminalIcon(states()[state.id] ?? icon(), icons.style())} ${state.label}`,
              value: `state:${state.id}`,
              description: states()[state.id] ? 'Custom state icon' : 'Uses base icon',
              icon: 'edit' as const,
            }))
          : []),
        {
          title: props.expected ? 'Save' : 'Pin to toolbar',
          value: 'save',
          description: 'Save this draft',
          icon: 'save',
        },
        ...(existing()
          ? [
              {
                title: 'Unpin',
                value: 'unpin',
                description: 'Remove only this toolbar button',
                icon: 'delete' as const,
              },
            ]
          : []),
        { title: 'Cancel', value: 'cancel', description: 'Discard this draft', icon: 'close' },
      ]}
      onSelect={(option) => {
        if (option.value === 'base') choose()
        else if (option.value.startsWith('state:')) choose(option.value.slice(6))
        else if (option.value === 'save') save()
        else if (option.value === 'unpin') {
          props.preferences.changeToolbarPin({ operation: 'remove', key: toolbarPinKey(props.pin) })
          dialogs.back()
        } else dialogs.back()
      }}
    />
  )
}
