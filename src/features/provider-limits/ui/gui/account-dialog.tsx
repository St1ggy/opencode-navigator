import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'

import type { createCodexAccountLinkModel } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiCodexAccountDialog(props: {
  ui: Ui
  model: ReturnType<typeof createCodexAccountLinkModel>
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const [preview, setPreview] = createSignal<Awaited<ReturnType<typeof props.model.discover>>>()
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  createEffect(() => {
    if (!props.model.current() && !busy()) props.close()
  })

  async function verify() {
    if (busy() || !props.model.current()) return

    setBusy(true)
    setError('')
    try {
      const value = await props.model.discover()

      if (!disposed) {
        setPreview(value)

        if (!value) setError('Account verification is unavailable or the target changed. Reopen this dialog to retry.')
      }
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'Could not verify the Codex account.')
    } finally {
      if (!disposed) setBusy(false)
    }
  }
  async function confirm() {
    const value = preview()

    if (!value || busy() || !props.model.current()) return

    setBusy(true)
    setError('')
    try {
      const saved = await props.model.confirm(value)

      if (!disposed) {
        if (saved) props.close()
        else setError('The account changed during verification. Verify it again before linking.')
      }
    } catch (error_) {
      if (!disposed) setError(error_ instanceof Error ? error_.message : 'Could not save the account binding.')
    } finally {
      if (!disposed) setBusy(false)
    }
  }
  onMount(() => void verify())

  return (
    <Dialog
      title="Link Codex CLI account"
      description="This verifies your existing local Codex sign-in. It does not sign in, copy tokens or spend reset credits."
      footer={
        <>
          <Button onClick={props.close}>Cancel</Button>
          <Button busy={busy()} onClick={() => void verify()}>
            Verify account
          </Button>
          <Button
            variant="contrast"
            disabled={!preview() || busy() || !props.model.current()}
            onClick={() => void confirm()}
          >
            Link account
          </Button>
        </>
      }
    >
      <Show when={preview()}>
        {(value) => (
          <p>
            Use Codex CLI account <strong>{value().accountID}</strong> for the selected{' '}
            <strong>{value().model.providerID}</strong> connection across models, projects and sessions? Only confirm
            matching accounts.
          </p>
        )}
      </Show>
      <Show when={error()}>
        <p role="alert">{error()}</p>
      </Show>
    </Dialog>
  )
}
