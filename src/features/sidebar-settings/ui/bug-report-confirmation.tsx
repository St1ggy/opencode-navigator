import { useTerminalDimensions } from '@opentui/solid'
import { onCleanup } from 'solid-js'

import { DialogAction, DialogHeader, DialogSurface, GuardedConfirmation, useDialogState } from '../../../shared/ui'
import { BUG_REPORT_REPOSITORY } from '../model/bug-report-browser'

import type { BugReportDraft } from '../model/bug-report-draft'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function BugReportConfirmation(props: {
  api: TuiPluginApi
  draft: BugReportDraft
  current(): boolean
  onConfirm(): void
}) {
  return (
    <GuardedConfirmation
      api={props.api}
      title="Send Bug report"
      message={props.draft.title}
      current={props.current}
      onConfirm={props.onConfirm}
      render={(actions) => <BugReportReview api={props.api} draft={props.draft} {...actions} />}
    />
  )
}

function BugReportReview(props: { api: TuiPluginApi; draft: BugReportDraft; confirm(): void; cancel(): void }) {
  const dimensions = useTerminalDimensions()
  const [selected, setSelected] = useDialogState('confirm-report', 0)
  let body: ScrollBoxRenderable | undefined
  const prefix = 'opencode-navigator.bug-report.confirm'
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1200,
    commands: [
      { name: `${prefix}.switch`, run: () => setSelected((value) => 1 - value) },
      { name: `${prefix}.activate`, run: () => (selected() ? props.confirm() : props.cancel()) },
      { name: `${prefix}.up`, run: () => body?.scrollBy(-1) },
      { name: `${prefix}.down`, run: () => body?.scrollBy(1) },
    ],
    bindings: [
      ...['tab', 'shift+tab', 'left', 'right'].map((key) => ({ key, cmd: `${prefix}.switch` })),
      { key: 'return', cmd: `${prefix}.activate` },
      { key: 'up', cmd: `${prefix}.up` },
      { key: 'down', cmd: `${prefix}.down` },
    ],
  })

  onCleanup(unregister)

  return (
    <DialogSurface api={props.api} lift>
      <DialogHeader api={props.api} title="Send Bug report" icon="bug" onBack={props.cancel} />
      <text fg={props.api.theme.current.textMuted} wrapMode="word">
        Public issue in {BUG_REPORT_REPOSITORY} · Type: Bug
      </text>
      <scrollbox
        ref={(node) => {
          body = node
        }}
        height={Math.max(3, Math.min(12, dimensions().height - 15))}
        scrollX={false}
      >
        <text fg={props.api.theme.current.text} wrapMode="word">
          {props.draft.title}
          {'\n\n'}
          {props.draft.body}
        </text>
      </scrollbox>
      <box flexDirection="row" gap={1}>
        <DialogAction
          api={props.api}
          id={`${prefix}.cancel`}
          label="Cancel"
          icon="close"
          selected={selected() === 0}
          onSelect={() => setSelected(0)}
          onActivate={props.cancel}
        />
        <DialogAction
          api={props.api}
          id={`${prefix}.send`}
          label="Send report"
          icon="export"
          selected={selected() === 1}
          onSelect={() => setSelected(1)}
          onActivate={props.confirm}
        />
      </box>
    </DialogSurface>
  )
}
