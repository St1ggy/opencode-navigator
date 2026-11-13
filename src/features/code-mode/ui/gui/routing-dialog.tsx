import { Show, createSignal, onCleanup } from 'solid-js'

import { GuiNotice, GuiReviewBody } from '../../../../shared/ui/gui'

import { GuiRoutingReview } from './routing-review'

import type { CodeModeController, RoutingPreview } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiRoutingDialog(props: { ui: Ui; model: CodeModeController; server: string; close(): void }) {
  const [mode, setMode] = createSignal<'code' | 'direct'>(
    props.model.routing(props.server).mode === 'direct' ? 'direct' : 'code',
  )
  const [preview, setPreview] = createSignal<RoutingPreview>()
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const Select = props.ui.Select
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const state = () => props.model.routing(props.server)
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  async function action() {
    if (busy()) return

    setBusy(true)
    setError('')
    try {
      const prepared = preview()

      if (prepared) {
        await props.model.apply(prepared)

        if (!disposed) props.close()
      } else {
        const next = await props.model.preview(props.server, mode())

        if (!disposed) setPreview(next)
      }
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'Could not update routing. Preview again.')
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  return (
    <Dialog
      title="MCP routing"
      description={props.server}
      size="large"
      footer={
        <>
          <Button disabled={busy()} onClick={() => (preview() ? setPreview(undefined) : props.close())}>
            {preview() ? 'Back' : 'Cancel'}
          </Button>
          <Button
            variant="contrast"
            busy={busy()}
            disabled={!state().source || !props.model.current() || busy()}
            onClick={() => void action()}
          >
            {preview() ? 'Apply routing change' : 'Preview change'}
          </Button>
        </>
      }
    >
      <GuiReviewBody>
        <Show when={!preview()}>
          <Section title="Tool access">
            <Row
              title="Routing mode"
              description={
                mode() === 'code'
                  ? 'Tools are reached through execute under the server namespace.'
                  : 'Tools appear directly in the model tool list.'
              }
            >
              <Select
                label="New routing mode"
                disabled={busy()}
                value={mode()}
                options={[
                  { value: 'code', label: 'Code Mode' },
                  { value: 'direct', label: 'Direct' },
                ]}
                onChange={(value) => setMode(value === 'direct' ? 'direct' : 'code')}
              />
            </Row>
            <Row
              title="Current configuration"
              description={state().explicit ? 'Explicitly set in server configuration.' : 'Inherited host default.'}
            >
              <span>{state().mode === 'code' ? 'Code Mode' : state().mode === 'direct' ? 'Direct' : 'Unknown'}</span>
            </Row>
          </Section>
          <GuiNotice ui={props.ui} title="Connection controls stay independent">
            Changing routing does not connect the server or change permissions. Actual tool availability is not exposed
            by this host.
          </GuiNotice>
        </Show>
        <Show when={preview()}>
          {(prepared) => (
            <GuiRoutingReview
              ui={props.ui}
              preview={prepared()}
              before={state().mode === 'code' ? 'Code Mode' : state().mode === 'direct' ? 'Direct' : 'Unknown'}
            />
          )}
        </Show>
        <Show when={state().reason}>
          <GuiNotice ui={props.ui} title="Configuration source unavailable">
            {state().reason}
          </GuiNotice>
        </Show>
        <Show when={error()}>
          <GuiNotice ui={props.ui} title="Routing change could not be prepared" error>
            {error()}
          </GuiNotice>
        </Show>
      </GuiReviewBody>
    </Dialog>
  )
}
