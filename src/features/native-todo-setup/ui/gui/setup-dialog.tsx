import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js'

import { TodoEnableConfirmation } from './confirmation'

import type { TodoSetupController } from '../../model'
import type { Dialogs, Ui } from '@opencode/plugin/gui'

export function TodoSetupDialog(props: {
  ui: Ui
  dialogs: Dialogs
  model: TodoSetupController
  sessionID: string
  current(): boolean
  close(): void
  enabled(): void
}) {
  const [path, setPath] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  const files = () => (props.current() ? props.model.files(props.sessionID) : [])
  const selected = () => path() || files()[0] || ''
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  createEffect(() => {
    if (!props.current()) props.close()
  })

  async function preview() {
    if (busy() || !props.current() || !selected()) return

    setBusy(true)
    setError('')
    try {
      const prepared = await props.model.prepare(props.sessionID, selected())

      if (disposed || !props.current()) return

      props.dialogs.open((dialog) => (
        <TodoEnableConfirmation
          ui={props.ui}
          model={props.model}
          preview={prepared}
          current={props.current}
          close={dialog.close}
          enabled={() => {
            props.enabled()
            props.close()
          }}
        />
      ))
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'Could not prepare Todo configuration.')
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  return (
    <Dialog
      title="Enable native Todo"
      description="Choose an existing configuration discovered by the selected OpenCode server."
      footer={
        <>
          <Button onClick={props.close}>Cancel</Button>
          <Button variant="contrast" busy={busy()} disabled={!selected()} onClick={() => void preview()}>
            Preview change
          </Button>
        </>
      }
    >
      <label>
        Configuration file
        <select
          aria-label="Todo configuration file"
          value={selected()}
          onChange={(event) => setPath(event.currentTarget.value)}
          style={{ display: 'block', width: '100%', padding: '8px', color: 'inherit', background: 'transparent' }}
        >
          <For each={files()}>{(file) => <option value={file}>{file}</option>}</For>
        </select>
      </label>
      <Show when={files().length === 0}>
        <p>No editable configuration source is currently available.</p>
      </Show>
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
      <Button variant="ghost" size="small" onClick={() => void props.model.refresh(props.sessionID)}>
        Refresh sources
      </Button>
    </Dialog>
  )
}
