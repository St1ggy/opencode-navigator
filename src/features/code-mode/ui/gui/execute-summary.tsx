import { Show } from 'solid-js'

import { GuiIconAction } from '../../../../shared/ui/gui'
import { executeDuration, executeTimestamp } from '../../model'

import type { ExecuteRun } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiExecuteSummary(props: { ui: Ui; run: ExecuteRun; now: number; expanded: boolean; toggle(): void }) {
  const Icon = props.ui.Icon
  const color = () => (props.run.status === 'error' ? 'var(--v2-state-fg-error)' : 'var(--v2-text-text-base)')

  return (
    <>
      <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', color: color() }}>
          <Icon
            name={
              props.run.status === 'error'
                ? 'circle-exclamation'
                : props.run.status === 'completed'
                  ? 'circle-check'
                  : 'status'
            }
          />
          <span style={{ 'font-weight': '500', 'text-transform': 'capitalize' }}>{props.run.status}</span>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
          <span
            style={{ color: 'var(--v2-text-text-muted)', 'font-size': '12px', 'font-variant-numeric': 'tabular-nums' }}
          >
            {executeDuration(props.run, props.now)}
          </span>
          <GuiIconAction
            ui={props.ui}
            icon="info"
            label={props.expanded ? 'Hide operation details' : 'Operation details'}
            onClick={props.toggle}
          />
        </div>
      </div>
      <Show when={props.expanded}>
        <dl
          style={{
            display: 'grid',
            'grid-template-columns': '80px minmax(0, 1fr)',
            gap: '6px 12px',
            margin: '0',
            'font-size': '11px',
            color: 'var(--v2-text-text-muted)',
          }}
        >
          <dt>Operation</dt>
          <dd style={{ margin: '0', 'overflow-wrap': 'anywhere' }}>{props.run.id}</dd>
          <dt>Message</dt>
          <dd style={{ margin: '0', 'overflow-wrap': 'anywhere' }}>{props.run.messageID}</dd>
          <dt>Created</dt>
          <dd style={{ margin: '0' }}>{executeTimestamp(props.run.created)}</dd>
          <dt>Started</dt>
          <dd style={{ margin: '0' }}>{executeTimestamp(props.run.started)}</dd>
          <dt>Finished</dt>
          <dd style={{ margin: '0' }}>{executeTimestamp(props.run.completed)}</dd>
        </dl>
      </Show>
    </>
  )
}
