import { createEffect } from 'solid-js'

export function createSortableFocus(props: { root(): HTMLElement; keys(): readonly string[]; disabled(): boolean }) {
  let focused: string | undefined

  createEffect(() => {
    const keys = props.keys()
    const disabled = props.disabled()
    const key = focused

    if (!key || disabled || !keys.includes(key)) return

    queueMicrotask(() => {
      if (focused !== key || props.disabled() || document.activeElement !== document.body) return

      const row = [...props.root().querySelectorAll<HTMLElement>('[data-sortable-item]')].find(
        (node) => node.dataset.sortableItem === key,
      )

      row?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    })
  })

  return {
    enter(event: FocusEvent) {
      const target = event.target as HTMLElement

      focused = target.getAttribute('aria-label')?.startsWith('Reorder ')
        ? target.closest<HTMLElement>('[data-sortable-item]')?.dataset.sortableItem
        : undefined
    },
    leave(event: FocusEvent) {
      if (event.relatedTarget && !props.root().contains(event.relatedTarget as Node)) focused = undefined
    },
  }
}
