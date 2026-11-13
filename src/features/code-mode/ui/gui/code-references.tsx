import { For, Show, createMemo } from 'solid-js'

import { executeReferenceView } from '../../model'

import type { ExecuteCodeReferences } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiExecuteReferences(props: {
  ui: Pick<Ui, 'Icon'>
  references: ExecuteCodeReferences
  limit?: number
  showOrigin?: boolean
}) {
  const Icon = props.ui.Icon
  const view = createMemo(() => executeReferenceView(props.references, props.limit, props.showOrigin !== false))

  return (
    <span style={{ display: 'flex', 'flex-direction': 'column', gap: '3px', 'min-width': '0', 'text-align': 'left' }}>
      <For each={view().visible} fallback={<span>MCP / method not identified</span>}>
        {(item) => (
          <span style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'min-width': '0' }}>
            <span
              style={{ 'font-weight': '500', 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis' }}
            >
              {item.namespace}
            </span>
            <span style={{ display: 'flex', 'flex-shrink': '0', color: 'var(--v2-icon-icon-muted)' }}>
              <Icon name="arrow-right" size="small" />
            </span>
            <span
              style={{ 'min-width': '0', 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis' }}
            >
              {item.method}
            </span>
          </span>
        )}
      </For>
      <Show when={view().caption}>
        <span style={{ 'font-size': '11px', color: 'var(--v2-text-text-muted)', 'font-weight': '400' }}>
          {view().caption}
        </span>
      </Show>
    </span>
  )
}
