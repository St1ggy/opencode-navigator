import { Show } from 'solid-js'

import { useNavigatorGui } from './context'

import type { McpItem } from '../../../../entities/mcp/model'

export function McpIndicator(props: { status: McpItem['status'] }) {
  const Loader = useNavigatorGui().ui.Loader

  return (
    <span
      role="img"
      aria-label={props.status}
      style={{
        display: 'inline-flex',
        width: '16px',
        height: '16px',
        'flex-shrink': '0',
        'align-items': 'center',
        'justify-content': 'center',
      }}
    >
      <Show when={props.status !== 'pending'} fallback={<Loader size="small" />}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            width: '12px',
            height: '12px',
            'flex-shrink': '0',
            'border-radius': '50%',
            border: '1px solid currentColor',
            background: props.status === 'connected' ? 'currentColor' : 'transparent',
            opacity: props.status === 'failed' ? 1 : 0.65,
          }}
        />
      </Show>
    </span>
  )
}
