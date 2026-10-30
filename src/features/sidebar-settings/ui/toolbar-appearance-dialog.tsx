import { quickActionStates } from '../../../entities/quick-action'
import { SelectionMenu, terminalIcon, useDialogs, useIcons } from '../../../shared/ui'

import { ToolbarIconGroupDialog } from './toolbar-icon-group-dialog'

import type { ToolbarPinDraft } from '../model/toolbar-pin-draft'
import type { ToolbarPinSettings } from '../model/toolbar-settings'

export function ToolbarAppearanceDialog(props: ToolbarPinSettings & { draft: ToolbarPinDraft }) {
  const dialogs = useDialogs(props.api)
  const icons = useIcons()
  const states = () => {
    const known = props.pin.kind === 'action' ? quickActionStates(props.api, props.pin.id) : []
    const saved = Object.keys(props.draft.states()).filter((id) => known.every((state) => state.id !== id))

    return [...known, ...saved.map((id) => ({ id, label: `Saved state: ${id}` }))]
  }
  const preview = (state?: string) =>
    props.draft
      .group(state)
      .map((id) => terminalIcon(id, icons.style()))
      .join(' ') || 'No icons'

  return (
    <SelectionMenu
      api={props.api}
      title="Toolbar icons and text"
      adaptive
      height={18}
      options={[
        {
          title: 'Base icons…',
          value: 'base',
          description: `${props.draft.base().length} of 3 · ${preview()}`,
          icon: 'edit',
        },
        { title: 'Text…', value: 'text', description: props.draft.text() || 'Optional custom label', icon: 'edit' },
        ...states().map((state) => ({
          title: `${state.label} icons…`,
          value: `state:${state.id}`,
          description: preview(state.id),
          icon: 'edit' as const,
        })),
        { title: 'Back', value: 'back', description: 'Return to the unsaved button configuration', icon: 'close' },
      ]}
      onSelect={(option) => {
        if (option.value === 'text') props.draft.editText()
        else if (option.value === 'base' || option.value.startsWith('state:')) {
          const state = option.value === 'base' ? undefined : option.value.slice(6)

          dialogs.open(() => (
            <ToolbarIconGroupDialog
              api={props.api}
              title="Choose zero to three icons"
              initial={props.draft.group(state)}
              onConfirm={(value) => props.draft.changeGroup(value, state)}
            />
          ))
        } else dialogs.back()
      }}
    />
  )
}
