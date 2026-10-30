import { toolbarPinKey } from '../../../entities/preferences'
import { quickActionStates } from '../../../entities/quick-action'
import { SelectionMenu, terminalIcon, useIcons } from '../../../shared/ui'
import { createToolbarPinDraft } from '../model/toolbar-pin-draft'

import { ToolbarAppearanceDialog } from './toolbar-appearance-dialog'

import type { ToolbarPinSettings } from '../model/toolbar-settings'

export function ToolbarPinDialog(props: ToolbarPinSettings & { expected?: string }) {
  const model = createToolbarPinDraft(props)
  const icons = useIcons()
  const existing = () => props.preferences.toolbarPins().some((pin) => toolbarPinKey(pin) === toolbarPinKey(props.pin))
  const preview = (state?: string) =>
    model
      .group(state)
      .map((id) => terminalIcon(id, icons.style()))
      .join(' ')

  return (
    <SelectionMenu
      adaptive
      api={props.api}
      title={props.pin.kind === 'skill' ? `Pin Skill · ${props.pin.name}` : 'Pin Quick Action'}
      height={21}
      options={[
        { title: `${preview()} Base icon`, value: 'base', description: 'Choose the primary icon', icon: 'edit' },
        ...(props.pin.kind === 'action'
          ? quickActionStates(props.api, props.pin.id).map((state) => ({
              title: `${preview(state.id)} ${state.label}`,
              value: `state:${state.id}`,
              description: model.states()[state.id] ? 'Custom state icons' : 'Uses base icons',
              icon: 'edit' as const,
            }))
          : []),
        {
          title: props.expected ? 'Save' : 'Pin to toolbar',
          value: 'save',
          description: 'Save this button draft',
          icon: 'save',
        },
        {
          title: 'Icons and text…',
          value: 'appearance',
          description: `${model.base().length} icons${model.text() ? ` · ${model.text()}` : ''}`,
          icon: 'edit',
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
        if (option.value === 'base') model.choose()
        else if (option.value.startsWith('state:')) model.choose(option.value.slice(6))
        else if (option.value === 'save') model.save()
        else if (option.value === 'appearance')
          model.dialogs.open(() => <ToolbarAppearanceDialog {...props} draft={model} />)
        else {
          if (option.value === 'unpin')
            props.preferences.changeToolbarPin({ operation: 'remove', key: toolbarPinKey(props.pin) })

          model.dialogs.back()
        }
      }}
    />
  )
}
