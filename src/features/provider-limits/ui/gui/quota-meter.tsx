export function GuiQuotaMeter(props: { label: string; value: string; ratio?: number; color: string; name: string }) {
  return (
    <div style={{ display: 'grid', gap: '6px', 'min-width': '0' }}>
      <div style={{ display: 'flex', gap: '8px', 'justify-content': 'space-between', 'font-size': '12px' }}>
        <span style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>{props.label}</span>
        <span style={{ 'flex-shrink': '0' }}>{props.value}</span>
      </div>
      <div
        role="meter"
        aria-label={props.name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={props.ratio === undefined ? undefined : Math.round(props.ratio * 100)}
        aria-valuetext={props.value || props.label}
        style={{
          height: '5px',
          overflow: 'hidden',
          'border-radius': '3px',
          background: 'color-mix(in srgb, currentColor 10%, transparent)',
        }}
      >
        <div style={{ height: '100%', width: `${(props.ratio ?? 0) * 100}%`, background: props.color }} />
      </div>
    </div>
  )
}
