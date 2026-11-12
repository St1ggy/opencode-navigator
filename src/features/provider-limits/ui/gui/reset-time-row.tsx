import type { Ui } from '@opencode/plugin/gui'

export function GuiResetTimeRow(props: {
  ui: Pick<Ui, 'Button'>
  label: string
  value: string
  absolute: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const Button = props.ui.Button

  return (
    <Button size="small" variant="ghost" disabled={props.disabled} onClick={props.onToggle} class="w-full min-w-0">
      <span style={{ display: 'flex', width: '100%', 'min-width': '0', 'align-items': 'center', gap: '8px' }}>
        {/* Desktop 2.2.6's public icon catalog has no swap glyph. */}
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          style={{ 'flex-shrink': '0' }}
        >
          <path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4" />
        </svg>
        <span
          title={props.label}
          style={{
            flex: '1',
            'min-width': '0',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
            'text-align': 'left',
          }}
        >
          {props.label}
        </span>
        <span style={{ 'flex-shrink': '0', 'font-variant-numeric': 'tabular-nums' }}>{props.value}</span>
        <span
          style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', 'clip-path': 'inset(50%)' }}
        >
          {`Show ${props.absolute ? 'relative' : 'absolute'} reset time`}
        </span>
      </span>
    </Button>
  )
}
