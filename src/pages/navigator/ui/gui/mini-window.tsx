import { createMiniWindowInteraction } from './mini-window-interaction'

import type { MiniWindowRect } from '../../model'
import type { Ui } from '@opencode/plugin/gui'
import type { JSX } from 'solid-js'

export function NavigatorMiniWindow(props: {
  ui: Ui
  title: string
  rect: MiniWindowRect
  mode: 'dark' | 'light'
  modal: boolean
  children: JSX.Element
  setRect(rect: MiniWindowRect): void
  redock(): void
  refresh(): void
  search(): void
}) {
  const Button = props.ui.Button
  const IconButton = props.ui.IconButton
  const interaction = createMiniWindowInteraction(props)

  function dragHeader(event: PointerEvent) {
    const target = event.target as Element

    if (target.closest('button, input, select, textarea, a') && !target.closest('[data-navigator-move]')) return

    interaction.start(event, 'move')
  }

  return (
    <aside
      aria-label={`Navigator mini-window: ${props.title}`}
      aria-hidden={props.modal}
      inert={props.modal}
      data-navigator-floating
      style={{
        position: 'fixed',
        left: `${props.rect.x}px`,
        top: `${props.rect.y}px`,
        width: `${props.rect.width}px`,
        height: `${props.rect.height}px`,
        display: 'flex',
        'flex-direction': 'column',
        'z-index': '40',
        visibility: props.modal ? 'hidden' : 'visible',
        background: 'var(--v2-background-bg-layer-01)',
        color: 'var(--v2-text-text-base)',
        'color-scheme': props.mode,
        border: '1px solid var(--v2-border-border-base, color-mix(in srgb, currentColor 20%, transparent))',
        'border-radius': '12px',
        'box-shadow': 'var(--v2-elevation-overlay, 0 8px 32px #0003)',
        overflow: 'hidden',
        'font-size': '13px',
      }}
    >
      <header
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '4px',
          padding: '8px',
          'flex-wrap': 'wrap',
          cursor: 'move',
          'touch-action': 'none',
          'user-select': 'none',
        }}
        onPointerDown={dragHeader}
        onPointerMove={interaction.move}
        onPointerUp={interaction.end}
        onPointerCancel={interaction.end}
        onLostPointerCapture={interaction.end}
      >
        <span
          data-navigator-move
          title="Drag or use arrow keys; Shift moves ten pixels"
          onKeyDown={(event) => interaction.key(event, 'move')}
        >
          <IconButton icon="dot-grid" label="Move Navigator mini-window" />
        </span>
        <strong style={{ flex: '1', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
          {props.title}
        </strong>
        <Button size="small" variant="ghost" onClick={props.redock}>
          Dock
        </Button>
      </header>
      {props.children}
      <footer style={{ display: 'flex', gap: '4px', padding: '6px', 'align-items': 'center' }}>
        <Button size="small" variant="ghost" onClick={props.search}>
          Search
        </Button>
        <Button size="small" variant="ghost-muted" onClick={props.refresh}>
          Refresh
        </Button>
        <Button size="small" variant="ghost-muted" onClick={interaction.reset}>
          Reset position
        </Button>
        <span
          title="Drag or use arrow keys; Shift resizes ten pixels"
          style={{ 'margin-left': 'auto', cursor: 'nwse-resize', 'touch-action': 'none' }}
          onPointerDown={(event) => interaction.start(event, 'resize')}
          onPointerMove={interaction.move}
          onPointerUp={interaction.end}
          onPointerCancel={interaction.end}
          onLostPointerCapture={interaction.end}
          onKeyDown={(event) => interaction.key(event, 'resize')}
        >
          <IconButton icon="outline-expand" label="Resize Navigator mini-window" />
        </span>
      </footer>
    </aside>
  )
}
