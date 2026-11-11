import { Show } from 'solid-js'

import { formatSubagentDuration } from '../../../../entities/subagent/model'

import type { SubagentViewItem } from '../../../../entities/subagent/model'
import type { Ui } from '@opencode/plugin/gui'

export function SubagentRow(props: { ui: Ui; item: SubagentViewItem; now: number; open(): void }) {
  const Button = props.ui.Button

  return (
    <li>
      <Button size="small" variant="ghost" onClick={props.open}>
        {props.item.session.title}
      </Button>
      <p style={{ 'font-size': '12px', opacity: 0.65, margin: '0 0 8px', 'overflow-wrap': 'anywhere' }}>
        {props.item.run?.errorMessage ?? props.item.run?.outcome ?? props.item.status.type}
        <Show when={props.item.run}>
          {(run) => (
            <span>
              {' '}
              · {run().startedBeforeObservation ? 'Observed after start · ' : ''}
              {formatSubagentDuration(run().startedAt, run().finishedAt ?? props.now)}
            </span>
          )}
        </Show>
      </p>
    </li>
  )
}
