import { type JSX, Show } from 'solid-js'

export function GuiQuotaMeter(props: {
  label: string
  value: string
  ratio?: number
  color: string
  name: string
  icon?: JSX.Element
  labelAbove?: boolean
  row?: JSX.Element
}) {
  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': props.labelAbove ? 'column' : 'column-reverse',
        gap: '6px',
        'min-width': '0',
      }}
    >
      <div
        data-navigator-quota-label
        style={{
          display: 'flex',
          gap: '8px',
          'align-items': 'center',
          'justify-content': 'space-between',
          'font-size': '12px',
          'min-width': '0',
        }}
      >
        <Show
          when={props.row}
          fallback={
            <>
              {props.icon}
              <span
                title={props.label}
                style={{
                  flex: '1',
                  'min-width': '0',
                  overflow: 'hidden',
                  'text-overflow': 'ellipsis',
                  'white-space': 'nowrap',
                }}
              >
                {props.label}
              </span>
              <span style={{ 'flex-shrink': '0', 'font-variant-numeric': 'tabular-nums' }}>{props.value}</span>
            </>
          }
        >
          {props.row}
        </Show>
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
