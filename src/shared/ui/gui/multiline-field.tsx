import { createUniqueId } from 'solid-js'

export function GuiMultilineField(props: {
  label: string
  value: string
  onInput(value: string): void
  disabled?: boolean
}) {
  const id = createUniqueId()

  return (
    <label for={id} style={{ display: 'grid', gap: '8px' }}>
      <span>{props.label}</span>
      <textarea
        id={id}
        value={props.value}
        disabled={props.disabled}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        style={{
          width: '100%',
          'box-sizing': 'border-box',
          'min-height': '160px',
          'max-height': '40vh',
          resize: 'vertical',
          color: 'inherit',
          background: 'transparent',
          border: '1px solid currentColor',
          'border-radius': '6px',
          padding: '8px',
          font: 'inherit',
        }}
      />
    </label>
  )
}
