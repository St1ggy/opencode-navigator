import { createSignal } from 'solid-js'

import type { BugReportDraft } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiBugReportConfirmation(props: {
  ui: Ui
  draft: BugReportDraft
  send(): Promise<void>
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const [busy, setBusy] = createSignal(false)

  async function send() {
    if (busy()) return

    setBusy(true)
    try {
      await props.send()
      props.close()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      title="Submit this Bug report?"
      size="large"
      description="Creates a Bug issue in St1ggy/opencode-navigator using your already authenticated GitHub CLI."
      footer={
        <>
          <Button disabled={busy()} onClick={props.close}>
            Cancel
          </Button>
          <Button busy={busy()} variant="contrast" onClick={() => void send()}>
            Submit Bug report
          </Button>
        </>
      }
    >
      <div
        tabIndex={0}
        aria-label="Bug report confirmation"
        style={{ 'max-height': '52vh', 'overflow-y': 'auto', 'overflow-wrap': 'anywhere' }}
      >
        <h3>{props.draft.title}</h3>
        <pre style={{ 'white-space': 'pre-wrap', font: 'inherit' }}>{props.draft.body}</pre>
      </div>
    </Dialog>
  )
}
