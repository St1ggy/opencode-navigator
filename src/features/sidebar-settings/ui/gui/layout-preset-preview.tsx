import { For, Show, createSignal, onMount } from 'solid-js'

import { GuiMcpPreviewRows } from './mcp-preview-rows'

import type { createWorkspacePresetPreview } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiLayoutPresetPreview(props: {
  ui: Ui
  name: string
  model: ReturnType<typeof createWorkspacePresetPreview>
  current(): boolean
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')

  onMount(() => props.model.mcp?.refresh())
  async function apply() {
    if (busy() || !props.current() || props.model.blocked()) return

    const request = props.model.apply()

    if (!request) return

    setBusy(true)
    try {
      await request

      if (props.current()) props.close()
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Preset application failed. Review MCP and retry.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      title={`${props.model.linked ? 'Workspace profile' : 'Layout preview'}: ${props.name}`}
      description={`Scope: ${props.model.layout.scope()}. Applying does not replace the saved layout default.`}
      footer={
        <>
          <Button onClick={props.close}>Cancel</Button>
          <Button
            variant="contrast"
            disabled={!props.current() || !props.model.valid() || Boolean(props.model.blocked())}
            busy={busy()}
            onClick={() => void apply()}
          >
            Apply layout
          </Button>
        </>
      }
    >
      <Show when={props.model.blocked() || !props.current() || error()}>
        <p role="alert">{error() || props.model.blocked() || 'Server or session changed. Reopen the preview.'}</p>
      </Show>
      <ul style={{ 'max-height': '52vh', 'overflow-y': 'auto' }}>
        <For each={props.model.layout.preview()?.rows}>
          {(row) => (
            <li style={{ padding: '6px 0' }}>
              <strong>{row.section}</strong>
              <p>
                Visibility: {row.visibility[0] ? 'visible' : 'hidden'} → {row.visibility[1] ? 'visible' : 'hidden'} ·{' '}
                {row.expansion[0] ? 'expanded' : 'collapsed'} → {row.expansion[1] ? 'expanded' : 'collapsed'} · position{' '}
                {row.position[0]} → {row.position[1]}
              </p>
            </li>
          )}
        </For>
      </ul>
      <Show when={props.model.mcp}>
        {(model) => (
          <>
            <p>MCP scope: {model().scope}</p>
            <GuiMcpPreviewRows model={model()} />
          </>
        )}
      </Show>
    </Dialog>
  )
}
