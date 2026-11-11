import { For, createMemo, createSignal } from 'solid-js'

import { ICON_CHOICE_IDS, iconChoiceLabel } from '../../../../shared/lib/icon-choices'
import { GuiIcon } from '../../../../shared/ui/gui'

import type { Ui } from '@opencode/plugin/gui'

export function GuiIconPicker(props: { ui: Ui; choose(id: string): void; close(): void }) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const TextInput = props.ui.TextInput
  const [query, setQuery] = createSignal('')
  const choices = createMemo(() =>
    ICON_CHOICE_IDS.filter((id) => iconChoiceLabel(id).includes(query().trim().toLocaleLowerCase())),
  )

  return (
    <Dialog title="Choose an icon" size="large" footer={<Button onClick={props.close}>Cancel</Button>}>
      <TextInput label="Filter icons" value={query()} onInput={setQuery} autofocus class="w-full" />
      <div
        style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '4px',
          margin: '8px 0',
        }}
      >
        <For each={choices()}>
          {(id) => (
            <Button
              variant="ghost"
              onClick={() => {
                props.choose(id)
                props.close()
              }}
            >
              <GuiIcon ui={props.ui} id={id} />
              {iconChoiceLabel(id)}
            </Button>
          )}
        </For>
      </div>
    </Dialog>
  )
}
