import type { McpItem } from '../../../../entities/mcp/model'

export function McpIndicator(props: { status: McpItem['status'] }) {
  return (
    <span
      aria-label={props.status}
      style={{
        display: 'inline-flex',
        width: '12px',
        height: '12px',
        'flex-shrink': '0',
        'border-radius': '50%',
        border: '1px solid currentColor',
        'border-style': props.status === 'pending' ? 'dotted' : 'solid',
        background: props.status === 'connected' ? 'currentColor' : 'transparent',
        opacity: props.status === 'failed' ? 1 : 0.65,
      }}
    />
  )
}
