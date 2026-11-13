import { Show } from 'solid-js'

import type { Ui } from '@opencode/plugin/gui'

// Retain native control geometry while replacing its visible content in place.
export function GuiPendingSwitch(props: {
  ui: Ui
  label: string
  checked: boolean
  busy: boolean
  disabled?: boolean
  onChange(): void
}) {
  const Switch = props.ui.Switch
  const Loader = props.ui.Loader

  return (
    <span data-navigator-switch-slot style={{ position: 'relative', display: 'inline-flex', 'flex-shrink': '0' }}>
      <span
        aria-hidden={props.busy || undefined}
        style={{ display: 'flex', visibility: props.busy ? 'hidden' : 'visible' }}
      >
        <Switch
          label={props.label}
          hideLabel
          checked={props.checked}
          disabled={props.disabled || props.busy}
          onChange={() => {
            if (!props.busy && !props.disabled) props.onChange()
          }}
        />
      </span>
      <Show when={props.busy}>
        <span
          role="status"
          aria-label={`Updating ${props.label}`}
          style={{
            position: 'absolute',
            inset: '0',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
          }}
        >
          <Loader size="small" />
        </span>
      </Show>
    </span>
  )
}
