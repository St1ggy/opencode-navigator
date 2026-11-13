import { Show } from 'solid-js'

import type { Ui } from '@opencode/plugin/gui'
import type { JSX } from 'solid-js'

export function GuiReviewBody(props: { children: JSX.Element }) {
  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '16px', 'min-width': '0', 'font-size': '13px' }}>
      {props.children}
    </div>
  )
}

export function GuiNotice(props: { ui: Pick<Ui, 'Icon'>; title: string; children?: JSX.Element; error?: boolean }) {
  const Icon = props.ui.Icon

  return (
    <div
      role={props.error ? 'alert' : 'status'}
      style={{
        display: 'flex',
        gap: '8px',
        'align-items': 'flex-start',
        color: props.error ? 'var(--v2-state-fg-error)' : 'var(--v2-text-text-muted)',
        'font-size': '12px',
        'line-height': '1.5',
        'overflow-wrap': 'anywhere',
      }}
    >
      <span style={{ display: 'flex', 'flex-shrink': '0', 'padding-top': '2px' }}>
        <Icon name={props.error ? 'circle-exclamation' : 'info'} size="small" />
      </span>
      <div style={{ 'min-width': '0' }}>
        <span style={{ display: 'block', 'font-weight': '500' }}>{props.title}</span>
        <Show when={props.children}>
          <span>{props.children}</span>
        </Show>
      </div>
    </div>
  )
}

export function GuiChangeValue(props: { ui: Pick<Ui, 'Icon'>; before: string; after: string }) {
  const Icon = props.ui.Icon

  return (
    <span
      style={{
        display: 'inline-flex',
        'align-items': 'center',
        'justify-content': 'flex-end',
        'flex-wrap': 'wrap',
        gap: '6px',
        'font-size': '12px',
      }}
    >
      <span style={{ color: 'var(--v2-text-text-muted)' }}>{props.before}</span>
      <Icon name="arrow-right" size="small" />
      <span style={{ color: 'var(--v2-text-text-base)', 'font-weight': '500' }}>{props.after}</span>
    </span>
  )
}

export function GuiCodePanel(props: { ui: Pick<Ui, 'Code'>; content: string; language?: string; label: string }) {
  const Code = props.ui.Code

  return (
    <div
      tabIndex={0}
      aria-label={props.label}
      style={{ 'max-height': '280px', overflow: 'auto', 'min-width': '0', 'font-size': '12px' }}
    >
      <Code content={props.content} language={props.language} />
    </div>
  )
}
