import { Show, createMemo } from 'solid-js'

import { GuiTabs } from '../../../../shared/ui/gui'
import {
  createExecuteInspector,
  executeCodeReferences,
  executePayloadAction,
  executeReferenceLabel,
  executeRunIdentity,
} from '../../model'

import { GuiExecuteReferences } from './code-references'
import { GuiExecutePayload } from './execute-payload'
import { GuiExecuteSummary } from './execute-summary'

import type { ExecuteRun } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiExecuteDetails(props: { ui: Ui; run: () => ExecuteRun; now?: () => number; close(): void }) {
  const model = createExecuteInspector(props.run)
  const Dialog = props.ui.Dialog
  const Button = props.ui.Button
  const Icon = props.ui.Icon
  const references = createMemo(() => executeCodeReferences(props.run().input))
  const title = createMemo(() =>
    references().items.length === 1
      ? executeReferenceLabel(props.run().input).title
      : `Code Mode run ${executeRunIdentity(props.run())}`,
  )

  return (
    <Dialog
      title={title()}
      description={
        references().items.length > 0
          ? `In code · source references, not confirmed tool calls.${references().incomplete ? ' Some references unresolved.' : ''}`
          : 'MCP / method could not be identified from the public input.'
      }
      size="x-large"
      footer={<Button onClick={props.close}>Close</Button>}
    >
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px', 'min-width': '0', 'font-size': '13px' }}>
        <Show when={references().items.length > 1}>
          <GuiExecuteReferences ui={props.ui} references={references()} limit={model.metadata() ? undefined : 3} />
        </Show>
        <GuiExecuteSummary
          ui={props.ui}
          run={props.run()}
          now={props.now?.() ?? props.run().completed ?? Date.now()}
          expanded={model.metadata()}
          toggle={model.toggleMetadata}
        />
        <GuiTabs
          ui={props.ui}
          label="Execute payload"
          selected={model.tab()}
          onSelect={model.setTab}
          options={[
            { id: 'input', label: 'Code' },
            { id: 'output', label: 'Response' },
            { id: 'error', label: 'Error' },
          ]}
        />
        <div
          style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            gap: '8px',
            'font-size': '11px',
            color: 'var(--v2-text-text-muted)',
            'min-height': '24px',
          }}
        >
          <span>
            {model.content().language === 'javascript'
              ? 'JavaScript'
              : model.content().language === 'json'
                ? 'JSON'
                : 'Text'}
          </span>
          <Show when={model.canExpand()}>
            <Button size="small" variant="ghost" onClick={model.toggleRaw}>
              {executePayloadAction(model.tab(), model.raw())}
            </Button>
          </Show>
        </div>
        <Show keyed when={model.key()}>
          {(_key) => <GuiExecutePayload ui={props.ui} model={model} />}
        </Show>
        <div
          style={{
            display: 'flex',
            gap: '6px',
            'align-items': 'center',
            color: 'var(--v2-text-text-muted)',
            'font-size': '11px',
          }}
        >
          <Icon name="info" size="small" /> Nested MCP calls and payloads are not exposed by this host.
        </div>
      </div>
    </Dialog>
  )
}
