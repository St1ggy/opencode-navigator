import { For, createUniqueId } from 'solid-js'

import { createSortableFocus } from './sortable-focus'
import { createSortableInteraction } from './sortable-interaction'

import type { Ui } from '@opencode/plugin/gui'
import type { Accessor, JSX } from 'solid-js'

export function GuiSortableList<T>(props: {
  ui: Ui
  label: string
  items: readonly T[]
  itemKey(item: T): string
  itemLabel(item: T): string
  scope: string
  disabled?: boolean
  move(from: string, to: string): void
  children(item: Accessor<T>, handle: JSX.Element): JSX.Element
}) {
  let root!: HTMLDivElement
  const help = createUniqueId()
  const IconButton = props.ui.IconButton
  const keys = () => props.items.map((item) => props.itemKey(item))
  const focus = createSortableFocus({ root: () => root, keys, disabled: () => Boolean(props.disabled) })
  const interaction = createSortableInteraction({
    keys,
    scope: () => props.scope,
    disabled: () => Boolean(props.disabled),
    root: () => root,
    move: (from, to) => props.move(from, to),
  })

  return (
    <div
      ref={(node) => {
        root = node
      }}
      role="list"
      aria-label={props.label}
      aria-describedby={help}
      onFocusIn={focus.enter}
      onFocusOut={focus.leave}
      onPointerMove={interaction.hover}
      onPointerUp={interaction.end}
      onPointerCancel={interaction.cancel}
      onLostPointerCapture={interaction.cancel}
    >
      <For each={keys()}>
        {(key) => {
          const item = () => props.items.find((value) => props.itemKey(value) === key)!

          return (
            <div
              role="listitem"
              aria-posinset={keys().indexOf(key) + 1}
              aria-setsize={keys().length}
              data-sortable-item={key}
              style={{
                opacity: interaction.source() === key ? '0.65' : '1',
                outline:
                  interaction.target() === key && interaction.source() !== key
                    ? '1px dashed var(--v2-border-border-focus)'
                    : undefined,
              }}
            >
              {props.children(
                item,
                <span
                  title="Drag to reorder, or Space, arrow keys, Space. Escape cancels."
                  style={{ display: 'inline-flex', 'touch-action': 'none', cursor: 'grab' }}
                  onPointerDown={(event) => interaction.start(event, key)}
                  onKeyDown={(event) => interaction.key(event, key)}
                >
                  <IconButton
                    icon="dot-grid"
                    label={`Reorder ${props.itemLabel(item())}`}
                    disabled={props.disabled || keys().length < 2}
                  />
                </span>,
              )}
            </div>
          )
        }}
      </For>
      <span
        id={help}
        role="status"
        aria-live="polite"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', 'clip-path': 'inset(50%)' }}
      >
        Drag a handle, or press Space, use arrow keys, then Space to drop. Escape cancels. {interaction.announcement()}
      </span>
    </div>
  )
}
