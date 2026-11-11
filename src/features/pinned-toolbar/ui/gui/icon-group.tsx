import { createSignal } from 'solid-js'

import { iconChoiceLabel } from '../../../../shared/lib/icon-choices'
import { reorderItems } from '../../../../shared/lib/reorder'
import { GuiIcon, GuiSortableList } from '../../../../shared/ui/gui'

import { GuiIconPicker } from './icon-picker'

import type { Dialogs, Ui } from '@opencode/plugin/gui'

export function GuiIconGroupEditor(props: {
  ui: Ui
  dialogs: Dialogs
  initial: readonly string[]
  confirm(values: readonly string[]): void
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  let nextKey = props.initial.length
  const [slots, setSlots] = createSignal(props.initial.map((id, key) => ({ id, key })))
  const values = () => slots().map((slot) => slot.id)

  function choose(key?: number) {
    const select = (id: string) =>
      setSlots((previous) =>
        key === undefined
          ? [...previous, { id, key: nextKey++ }].slice(0, 3)
          : previous.map((slot) => (slot.key === key ? { ...slot, id } : slot)),
      )

    props.dialogs.open((dialog) => <GuiIconPicker ui={props.ui} close={dialog.close} choose={select} />)
  }

  return (
    <Dialog
      title="Choose zero to three icons"
      description="These choices remain an unsaved draft until you save the toolbar button."
      footer={
        <>
          <Button onClick={props.close}>Cancel</Button>
          <Button
            variant="contrast"
            onClick={() => {
              props.confirm(values())
              props.close()
            }}
          >
            Use these icons
          </Button>
        </>
      }
    >
      <GuiSortableList
        ui={props.ui}
        label="Button icon order"
        items={slots()}
        itemKey={(slot) => String(slot.key)}
        itemLabel={(slot) =>
          `Icon ${slots().findIndex((value) => value.key === slot.key) + 1}: ${iconChoiceLabel(slot.id)}`
        }
        scope="icon-draft"
        move={(from, to) => setSlots((previous) => reorderItems(previous, from, to, (slot) => String(slot.key)))}
      >
        {(slot, handle) => (
          <div style={{ display: 'flex', gap: '4px', margin: '4px 0' }}>
            {handle}
            <Button variant="ghost" onClick={() => choose(slot().key)}>
              <GuiIcon ui={props.ui} id={slot().id} />
              Icon {slots().findIndex((value) => value.key === slot().key) + 1}: {iconChoiceLabel(slot().id)}
            </Button>
            <Button
              variant="ghost-muted"
              onClick={() => setSlots((previous) => previous.filter((value) => value.key !== slot().key))}
            >
              Remove
            </Button>
          </div>
        )}
      </GuiSortableList>
      <Button disabled={values().length >= 3} onClick={() => choose()}>
        Add icon
      </Button>
    </Dialog>
  )
}
