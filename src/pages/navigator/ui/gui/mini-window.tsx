import { GuiIconAction } from '../../../../shared/ui/gui'

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
          display: 'grid',
          gap: '6px',
          padding: '8px',
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
        <strong
          data-navigator-session-title
          title={props.title}
          style={{
            'min-width': '0',
            overflow: 'hidden',
            'overflow-wrap': 'anywhere',
            display: '-webkit-box',
            '-webkit-line-clamp': '2',
            '-webkit-box-orient': 'vertical',
            'line-height': '20px',
          }}
        >
          {props.title}
        </strong>
        <div
          role="group"
          aria-label="Mini-window actions"
          style={{ display: 'flex', gap: '4px', 'align-items': 'center' }}
        >
          <span
            data-navigator-move
            title="Drag or use arrow keys; Shift moves ten pixels"
            onKeyDown={(event) => interaction.key(event, 'move')}
          >
            <GuiIconAction ui={props.ui} icon="dot-grid" label="Move Navigator mini-window" />
          </span>
          <GuiIconAction ui={props.ui} icon="layout-right" label="Dock" onClick={props.redock} />
        </div>
      </header>
      {props.children}
      <footer style={{ display: 'flex', gap: '4px', padding: '6px', 'align-items': 'center' }}>
        <GuiIconAction ui={props.ui} icon="magnifying-glass" label="Search" onClick={props.search} />
        <GuiIconAction ui={props.ui} icon="refresh" label="Refresh" onClick={props.refresh} />
        <GuiIconAction ui={props.ui} icon="outline-reset" label="Reset position" onClick={interaction.reset} />
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
          <GuiIconAction ui={props.ui} icon="outline-expand" label="Resize Navigator mini-window" />
        </span>
      </footer>
    </aside>
  )
}
