import { createSignal } from 'solid-js'

import { GuiReviewBody } from '../../../../shared/ui/gui'

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
  const Section = props.ui.SettingsSection
  const Row = props.ui.SettingsRow
  const Markdown = props.ui.Markdown
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
      <GuiReviewBody>
        <Section title="Issue preview">
          <Row title={props.draft.title} description="St1ggy/opencode-navigator · Bug" />
        </Section>
        <div aria-label="Bug report confirmation" style={{ 'overflow-wrap': 'anywhere' }}>
          <Markdown text={props.draft.body} />
        </div>
      </GuiReviewBody>
    </Dialog>
  )
}
