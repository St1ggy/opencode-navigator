import { Show, createSignal, onMount } from 'solid-js'

import { GuiMultilineField } from '../../../../shared/ui/gui'

import type { BugReportController } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiBugReportDialog(props: {
  ui: Ui
  model: BugReportController
  review(): Promise<void>
  browse(): Promise<void>
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const TextInput = props.ui.TextInput
  const Button = props.ui.Button
  const [error, setError] = createSignal('')
  const [reviewing, setReviewing] = createSignal(false)

  onMount(() => void props.model.probe())

  async function review() {
    if (reviewing() || !props.model.canSend()) return

    setReviewing(true)
    try {
      await props.review()
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Could not prepare the report. Try again.')
    } finally {
      setReviewing(false)
    }
  }

  return (
    <Dialog
      title="Report a Navigator bug"
      size="large"
      description="Only the text you review below is sent. Chat, source files, paths and logs are not collected."
      footer={
        <>
          <Button onClick={props.close}>Close</Button>
          <Button disabled={!props.model.canBrowse()} onClick={() => void props.browse()}>
            Open in browser
          </Button>
          <Button
            busy={props.model.busy() || reviewing()}
            disabled={!props.model.canSend()}
            onClick={() => void review()}
          >
            Review direct submission
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: '16px', 'max-height': '56vh', 'overflow-y': 'auto' }}>
        <TextInput
          label="Bug report title"
          value={props.model.draft().title}
          onInput={(title) => props.model.change({ title })}
          disabled={props.model.busy()}
        />
        <GuiMultilineField
          label="Bug report body"
          value={props.model.draft().body}
          onInput={(body) => props.model.change({ body })}
          disabled={props.model.busy()}
        />
        <p role="status">{props.model.readiness().message}</p>
        <Button size="small" onClick={() => void props.model.probe(true)}>
          Check GitHub CLI again
        </Button>
        <Show when={props.model.message() || props.model.result()?.message || error()}>
          <p role="status">{error() || props.model.result()?.message || props.model.message()}</p>
        </Show>
        <Show when={props.model.result()?.status === 'uncertain'}>
          <Button onClick={props.model.retryAfterReview}>I checked GitHub; allow another review</Button>
        </Show>
        <Show when={props.model.result() && props.model.result()?.status !== 'uncertain'}>
          <Button onClick={props.model.newReport}>New report</Button>
        </Show>
      </div>
    </Dialog>
  )
}
