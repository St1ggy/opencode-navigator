import { createMemo } from 'solid-js'

import { GuiExecuteReferences } from '../../../../features/code-mode/gui'
import { executeCodeReferences, executeDuration, executeRunCaption } from '../../../../features/code-mode/model'

import { useNavigatorGui } from './context'

import type { ExecuteRun } from '../../../../features/code-mode/model'

export function GuiCodeModeRun(props: { run: ExecuteRun }) {
  const services = useNavigatorGui()
  const Button = services.ui.Button
  const Icon = services.ui.Icon
  const references = createMemo(() => executeCodeReferences(props.run.input))
  const pending = () => props.run.status === 'running' || props.run.status === 'streaming'

  return (
    <li data-navigator-execute-run={props.run.id} style={{ display: 'grid', 'min-width': '0' }}>
      <Button variant="ghost" size="small" class="h-auto" onClick={() => services.onCodeModeRun?.(props.run.id)}>
        <span
          data-navigator-execute-content
          style={{
            display: 'flex',
            'flex-direction': 'column',
            gap: '6px',
            width: '100%',
            'min-width': '0',
            'padding-block': '4px',
            'text-align': 'left',
          }}
        >
          <span
            style={{
              display: 'flex',
              'justify-content': 'space-between',
              gap: '8px',
              'align-items': 'flex-start',
              'min-width': '0',
            }}
          >
            <span style={{ flex: '1', 'min-width': '0' }}>
              <GuiExecuteReferences ui={services.ui} references={references()} limit={2} showOrigin={false} />
            </span>
            <span
              style={{
                'font-variant-numeric': 'tabular-nums',
                color: 'var(--v2-text-text-muted)',
                'font-size': '11px',
                'font-weight': '400',
              }}
            >
              {executeDuration(props.run, services.runtime.codeMode!.now())}
            </span>
          </span>
          <span
            style={{
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'space-between',
              gap: '8px',
              color: 'var(--v2-text-text-muted)',
              'font-size': '11px',
              'font-weight': '400',
            }}
          >
            <span style={{ display: 'flex', 'align-items': 'center', gap: '5px' }}>
              <Icon
                name={props.run.status === 'error' ? 'circle-exclamation' : pending() ? 'status' : 'circle-check'}
                size="small"
              />
              {executeRunCaption(props.run, references())}
            </span>
          </span>
        </span>
      </Button>
    </li>
  )
}
