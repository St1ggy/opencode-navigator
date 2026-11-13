export function GuiQuotaMeter(props: { value: string; ratio?: number; color: string; name: string }) {
  return (
    <div
      role="meter"
      aria-label={props.name}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={props.ratio === undefined ? undefined : Math.round(props.ratio * 100)}
      aria-valuetext={props.value}
      style={{ height: '5px', background: 'color-mix(in srgb, currentColor 10%, transparent)' }}
    >
      <div style={{ height: '100%', width: `${(props.ratio ?? 0) * 100}%`, background: props.color }} />
    </div>
  )
}
