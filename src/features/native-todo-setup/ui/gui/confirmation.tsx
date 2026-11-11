import { Show, createEffect, createSignal, onCleanup } from 'solid-js'

import type { TodoSetupController, TodoSetupPreview } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function TodoEnableConfirmation(props: {
  ui: Ui
  model: TodoSetupController
  preview: TodoSetupPreview
  current(): boolean
  close(): void
  enabled(): void
}) {
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  createEffect(() => {
    if (!props.current()) props.close()
  })

  async function apply() {
    if (busy() || !props.current()) return

    setBusy(true)
    try {
      await props.model.apply(props.preview)

      if (!disposed && props.current()) {
        props.enabled()
        props.close()
      }
    } catch (error_) {
      if (!disposed)
        setError(error_ instanceof Error ? error_.message : 'Could not enable Todo. Refresh before retrying.')
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  return (
    <Dialog
      title="Enable native Todo"
      description="Change only experimental.todo in the selected server configuration."
      footer={
        <>
          <Button onClick={props.close}>Back</Button>
          <Button
            variant="contrast"
            busy={busy()}
            disabled={!props.current() || Boolean(error())}
            onClick={() => void apply()}
          >
            Enable Todo
          </Button>
        </>
      }
    >
      <p style={{ 'overflow-wrap': 'anywhere' }}>{props.preview.path}</p>
      <pre style={{ 'white-space': 'pre-wrap' }}>experimental.todo = true</pre>
      <details>
        <summary>Review exact file change</summary>
        <h3>Before</h3>
        <pre style={{ 'white-space': 'pre-wrap', 'overflow-wrap': 'anywhere' }}>{props.preview.original}</pre>
        <h3>After</h3>
        <pre style={{ 'white-space': 'pre-wrap', 'overflow-wrap': 'anywhere' }}>{props.preview.updated}</pre>
      </details>
      <p>Other settings and comments are preserved. Tasks are managed through chat and the built-in tool.</p>
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
    </Dialog>
  )
}
