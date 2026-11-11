import { Show, createEffect, createSignal } from 'solid-js'

import type { Ui } from '@opencode/plugin/gui'

export function GuiGroupControl(props: {
  ui: Ui
  label: string
  value?: string
  groups: readonly string[]
  save(value?: string): void
  disabled?: boolean
}) {
  const Select = props.ui.Select
  const TextInput = props.ui.TextInput
  const Button = props.ui.Button
  const [draft, setDraft] = createSignal('')
  const [creating, setCreating] = createSignal(false)

  createEffect(() => setDraft(props.value ?? ''))

  return (
    <div
      role="group"
      aria-label={`${props.label} grouping`}
      style={{ display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }}
    >
      <Select
        label={`${props.label} existing group`}
        value={props.groups.includes(draft()) ? draft() : ''}
        options={[{ value: '', label: 'Ungrouped' }, ...props.groups.map((value) => ({ value, label: value }))]}
        onChange={(value) => {
          setDraft(value)
          setCreating(false)
        }}
        disabled={props.disabled}
      />
      <Button
        size="small"
        variant="ghost"
        disabled={props.disabled}
        onClick={() => {
          setCreating(true)
          setDraft('')
        }}
      >
        New group
      </Button>
      <Show when={creating()}>
        <TextInput
          label={`${props.label} new group`}
          value={draft()}
          onInput={setDraft}
          disabled={props.disabled}
          invalid={draft().length > 64}
        />
      </Show>
      <Show when={creating() || draft() !== (props.value ?? '')}>
        <Button
          size="small"
          disabled={props.disabled || draft().length > 64 || (creating() && !draft().trim())}
          onClick={() => {
            props.save(draft().trim() || undefined)
            setCreating(false)
          }}
        >
          Save group
        </Button>
        <Button
          size="small"
          variant="ghost"
          onClick={() => {
            setDraft(props.value ?? '')
            setCreating(false)
          }}
        >
          Cancel
        </Button>
      </Show>
    </div>
  )
}
