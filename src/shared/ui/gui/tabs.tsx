import { For, Show } from 'solid-js'

import type { Ui } from '@opencode/plugin/gui'

export function GuiTabs<T extends string>(props: {
  ui: Pick<Ui, 'Button'>
  label: string
  selected: T
  options: readonly { id: T; label: string; count?: number; disabled?: boolean }[]
  onSelect(id: T): void
}) {
  const Button = props.ui.Button

  function navigate(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    const enabled = props.options.filter((option) => !option.disabled)

    if (enabled.length === 0) return

    event.preventDefault()
    event.stopPropagation()
    const index = enabled.findIndex((option) => option.id === props.selected)
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length

    props.onSelect(enabled[next].id)
    ;(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button:not(:disabled)')[next]?.focus()
  }

  return (
    <nav aria-label={props.label} onKeyDown={navigate} style={{ display: 'flex', gap: '4px', 'flex-wrap': 'wrap' }}>
      <For each={props.options.map((option) => option.id)}>
        {(id) => {
          const option = () => props.options.find((item) => item.id === id)!

          return (
            <Button
              size="small"
              disabled={option().disabled}
              variant={props.selected === id ? 'neutral' : 'ghost-muted'}
              onClick={() => props.onSelect(id)}
            >
              <span style={{ 'font-weight': props.selected === id ? '600' : '400' }}>{option().label}</span>
              <Show when={option().count !== undefined}>
                <span style={{ opacity: 0.6, 'font-weight': '400' }}>{option().count}</span>
              </Show>
            </Button>
          )
        }}
      </For>
    </nav>
  )
}
