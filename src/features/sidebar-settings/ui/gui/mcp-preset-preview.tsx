import { Show, createSignal, onCleanup, onMount } from 'solid-js'

import { GuiMcpPreviewRows } from './mcp-preview-rows'

import type { createMcpPresetPreview } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiMcpPresetPreview(props: {
  ui: Ui
  name: string
  model: ReturnType<typeof createMcpPresetPreview>
  persistent: boolean
  apply(): Promise<boolean>
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  onMount(props.model.refresh)

  async function apply() {
    if (busy() || props.model.blocked() || !props.model.valid()) return

    setBusy(true)
    setError('')
    try {
      if ((await props.apply()) && !disposed) props.close()
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'Could not apply this preset.')
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  return (
    <Dialog
      title={`MCP preview: ${props.name}`}
      description={`Scope: ${props.model.scope}`}
      size="large"
      footer={
        <>
          <Button onClick={props.close}>Back</Button>
          <Button onClick={props.model.refresh}>Refresh</Button>
          <Button
            variant="contrast"
            busy={busy()}
            disabled={!props.model.valid() || Boolean(props.model.blocked())}
            onClick={() => void apply()}
          >
            Apply
          </Button>
        </>
      }
    >
      <p>
        {props.persistent
          ? 'Desired states will be remembered for this scope, including unavailable servers.'
          : 'MCP persistence is off; desired states will not be saved.'}
      </p>
      <Show when={props.model.blocked() || error()}>
        <p role="alert">{error() || props.model.blocked()}</p>
      </Show>
      <GuiMcpPreviewRows model={props.model} />
    </Dialog>
  )
}
