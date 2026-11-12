import { createSignal } from 'solid-js'

import { SidebarBookmark } from './bookmark'

import type { JSX } from 'solid-js'

function navigate(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

  const row = event.currentTarget as HTMLElement
  const buttons = [...row.querySelectorAll<HTMLElement>('button:not(:disabled), input[role="switch"]:not(:disabled)')]
  const index = buttons.indexOf(event.target as HTMLElement)
  const next = Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))

  if (index === -1 || next === index) return

  event.preventDefault()
  event.stopPropagation()
  buttons[next]?.focus()
}

export function CatalogRow(props: {
  title: string
  details?: string
  favorite: boolean
  bookmarkDisabled?: boolean
  disabled?: boolean
  leading?: JSX.Element
  trailing?: JSX.Element
  content?: JSX.Element
  activate?(): void
  bookmark(): void
}) {
  const [hovered, setHovered] = createSignal(false)
  const [focused, setFocused] = createSignal(false)

  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusIn={() => setFocused(true)}
      onFocusOut={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
      }}
      onKeyDown={navigate}
      style={{ display: 'flex', gap: '4px', 'align-items': 'center', 'min-width': '0', padding: '3px 0' }}
    >
      <SidebarBookmark
        title={props.title}
        selected={props.favorite}
        disabled={props.bookmarkDisabled}
        visible={hovered() || focused()}
        toggle={props.bookmark}
      />
      {props.content ?? (
        <button
          type="button"
          aria-disabled={props.disabled}
          onClick={(event) => {
            event.stopPropagation()

            if (!props.disabled) props.activate?.()
          }}
          style={{
            flex: '1',
            'min-width': '0',
            display: 'flex',
            gap: '6px',
            'align-items': 'center',
            'text-align': 'left',
            padding: '4px',
            color: 'inherit',
            background: hovered() || focused() ? 'var(--v2-overlay-simple-overlay-hover, transparent)' : 'transparent',
            border: '0',
            'border-radius': '6px',
          }}
        >
          {props.leading}
          <span style={{ 'min-width': '0', flex: '1' }}>
            <span style={{ display: 'block', 'overflow-wrap': 'anywhere' }}>{props.title}</span>
            <span style={{ display: 'block', opacity: 0.65, 'font-size': '12px', 'overflow-wrap': 'anywhere' }}>
              {props.details}
            </span>
          </span>
        </button>
      )}
      {props.trailing}
    </li>
  )
}
