import { Show, createEffect, createSignal, onCleanup } from 'solid-js'

import { GuiCodePanel, GuiNotice, GuiReviewBody } from '../../../../shared/ui/gui'

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
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const [details, setDetails] = createSignal(false)
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
      size="large"
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
      <GuiReviewBody>
        <Section title="Configuration change">
          <Row title="Native Todo" description="experimental.todo">
            <span>Enabled</span>
          </Row>
          <Row
            title="Source file"
            description={<span style={{ 'overflow-wrap': 'anywhere' }}>{props.preview.path}</span>}
          />
        </Section>
        <Button size="small" variant="ghost" onClick={() => setDetails(!details())}>
          {details() ? 'Hide exact file change' : 'Review exact file change'}
        </Button>
        <Show when={details()}>
          <GuiCodePanel ui={props.ui} label="Before" content={props.preview.original} language="json" />
          <GuiCodePanel ui={props.ui} label="After" content={props.preview.updated} language="json" />
        </Show>
        <GuiNotice ui={props.ui} title="Other settings and comments are preserved">
          Tasks are managed through chat and the built-in tool.
        </GuiNotice>
        <Show when={error()}>
          <GuiNotice ui={props.ui} title="Todo could not be enabled" error>
            {error()}
          </GuiNotice>
        </Show>
      </GuiReviewBody>
    </Dialog>
  )
}
