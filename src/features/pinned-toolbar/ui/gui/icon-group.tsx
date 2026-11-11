import { For, createSignal } from 'solid-js'

import { iconChoiceLabel } from '../../../../shared/lib/icon-choices'
import { GuiIcon } from '../../../../shared/ui/gui'

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
  const [values, setValues] = createSignal([...props.initial])

  function choose(index: number) {
    props.dialogs.open((dialog) => (
      <GuiIconPicker
        ui={props.ui}
        close={dialog.close}
        choose={(id) =>
          setValues((previous) => {
            const next = [...previous]

            next[index] = id

            return next
          })
        }
      />
    ))
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
      <ol style={{ margin: '0', padding: '0', 'list-style': 'none' }}>
        <For each={values().map((_value, index) => index)}>
          {(index) => (
            <li style={{ display: 'flex', gap: '4px', margin: '4px 0' }}>
              <Button variant="ghost" onClick={() => choose(index)}>
                <GuiIcon ui={props.ui} id={values()[index]} />
                Icon {index + 1}: {iconChoiceLabel(values()[index])}
              </Button>
              <Button
                variant="ghost-muted"
                onClick={() => setValues((previous) => previous.filter((_value, offset) => offset !== index))}
              >
                Remove
              </Button>
            </li>
          )}
        </For>
      </ol>
      <Button disabled={values().length >= 3} onClick={() => choose(values().length)}>
        Add icon
      </Button>
    </Dialog>
  )
}
