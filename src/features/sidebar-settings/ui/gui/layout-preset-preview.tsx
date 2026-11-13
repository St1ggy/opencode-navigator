import { Show, createSignal, onMount } from 'solid-js'

import { GuiNotice, GuiReviewBody } from '../../../../shared/ui/gui'

import { GuiLayoutPreviewRows } from './layout-preview-rows'
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
      size="large"
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
      <GuiReviewBody>
        <Show when={props.model.blocked() || !props.current() || error()}>
          <GuiNotice ui={props.ui} title="Preview unavailable" error>
            {error() || props.model.blocked() || 'Server or session changed. Reopen the preview.'}
          </GuiNotice>
        </Show>
        <GuiLayoutPreviewRows ui={props.ui} rows={props.model.layout.preview()?.rows ?? []} />
        <Show when={props.model.mcp}>
          {(model) => (
            <>
              <GuiNotice ui={props.ui} title="Linked MCP preset">
                Scope: {model().scope}
              </GuiNotice>
              <GuiMcpPreviewRows ui={props.ui} model={model()} />
            </>
          )}
        </Show>
      </GuiReviewBody>
    </Dialog>
  )
}
