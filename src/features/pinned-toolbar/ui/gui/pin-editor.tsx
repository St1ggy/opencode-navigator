import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js'

import {
  toolbarPinAppearance,
  toolbarPinAppearanceChange,
  validToolbarPinText,
} from '../../../../entities/preferences/model'
import { GuiIcon } from '../../../../shared/ui/gui'

import { GuiIconGroupEditor } from './icon-group'

import type { ToolbarPin, ToolbarPinUpdate } from '../../../../entities/preferences/model'
import type { Dialogs, Ui } from '@opencode/plugin/gui'

export function GuiPinEditor(props: {
  ui: Ui
  dialogs: Dialogs
  pin: ToolbarPin
  expected?: string
  title: string
  current(): boolean
  save(change: ToolbarPinUpdate): Promise<void>
  close(): void
}) {
  const initial = toolbarPinAppearance(props.pin)
  const [base, setBase] = createSignal([...initial.base])
  const [text, setText] = createSignal(initial.text)
  const [states, setStates] = createSignal(initial.states)
  const [error, setError] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const TextInput = props.ui.TextInput
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  createEffect(() => {
    if (!props.current()) props.close()
  })

  function icons(state?: string) {
    const values = state ? (states()[state] ?? base()) : base()

    props.dialogs.open((dialog) => (
      <GuiIconGroupEditor
        ui={props.ui}
        dialogs={props.dialogs}
        initial={values}
        close={dialog.close}
        confirm={(value) => {
          if (state) setStates((previous) => ({ ...previous, [state]: [...value] }))
          else setBase([...value])
        }}
      />
    ))
  }
  async function save() {
    if (busy() || !props.current()) return

    setBusy(true)
    setError('')
    try {
      const change = toolbarPinAppearanceChange(
        props.pin,
        { base: base(), text: text(), states: states() },
        props.expected,
      )

      await props.save(change)

      if (!disposed) props.close()
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'Could not save the toolbar button.')
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  return (
    <Dialog
      title={props.expected ? 'Configure toolbar button' : 'Pin to toolbar'}
      description={props.title}
      footer={
        <>
          <Button onClick={props.close}>Cancel</Button>
          <Button
            variant="contrast"
            busy={busy()}
            disabled={!props.current() || !validToolbarPinText(text())}
            onClick={() => void save()}
          >
            {props.expected ? 'Save' : 'Pin'}
          </Button>
        </>
      }
    >
      <p>Base appearance</p>
      <div style={{ display: 'flex', gap: '4px', 'align-items': 'center' }}>
        <For each={base()}>{(id) => <GuiIcon ui={props.ui} id={id} />}</For>
        <span>{text()}</span>
      </div>
      <Button size="small" variant="ghost" onClick={() => icons()}>
        Choose icons
      </Button>
      <TextInput
        label="Optional button text"
        placeholder="Leave empty for icons only"
        value={text()}
        onInput={setText}
        invalid={!validToolbarPinText(text())}
        class="w-full"
      />
      <Show when={!validToolbarPinText(text())}>
        <p role="alert">Use a single line of up to 128 characters.</p>
      </Show>
      <For each={Object.keys(states())}>
        {(state) => (
          <Button size="small" variant="ghost" onClick={() => icons(state)}>
            Saved state: {state}
          </Button>
        )}
      </For>
      <Show when={Object.keys(states()).length > 0}>
        <p>Saved state icons are retained. Desktop uses the base icons unless the action exposes its state publicly.</p>
      </Show>
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
    </Dialog>
  )
}
