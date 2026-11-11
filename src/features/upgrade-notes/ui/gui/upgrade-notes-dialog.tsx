import { For } from 'solid-js'

import type { ChangelogEntry } from '../../../../entities/navigator-release/model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiUpgradeNotesDialog(props: {
  ui: Ui
  previous: string
  current: string
  entries: readonly ChangelogEntry[]
  close(): void
}) {
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const Markdown = props.ui.Markdown

  return (
    <Dialog
      title="Navigator updated"
      description={`${props.previous} → ${props.current}. You can browse these notes again in Settings → About.`}
      size="large"
      footer={
        <Button variant="contrast" onClick={props.close}>
          Continue
        </Button>
      }
    >
      <div tabIndex={0} aria-label="Navigator upgrade notes" style={{ 'max-height': '52vh', 'overflow-y': 'auto' }}>
        <For each={props.entries}>
          {(entry) => (
            <section>
              <h3>{entry.version}</h3>
              <Markdown text={entry.changes.map((change) => `- ${change}`).join('\n')} />
            </section>
          )}
        </For>
      </div>
    </Dialog>
  )
}
