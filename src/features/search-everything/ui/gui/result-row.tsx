import { Show } from 'solid-js'

import { GuiPendingSwitch } from '../../../../shared/ui/gui'

import type { SearchResult } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiSearchResultRow(props: {
  ui: Ui
  result: SearchResult
  selected: boolean
  busy: boolean
  favorite?: boolean
  focus(): void
  run(): void
  toggleFavorite(): void
  information(): void
}) {
  const Button = props.ui.Button
  const Loader = props.ui.Loader

  return (
    <li
      onFocusIn={props.focus}
      style={{ display: 'flex', gap: '4px', 'align-items': 'center', 'min-width': '0', padding: '3px 0' }}
    >
      <Show
        when={props.result.group === 'MCP'}
        fallback={
          <button
            type="button"
            aria-current={props.selected ? 'true' : undefined}
            aria-disabled={Boolean(props.result.disabled || props.busy)}
            onFocus={props.focus}
            onClick={(event) => {
              event.stopPropagation()
              props.run()
            }}
            style={{
              flex: '1',
              'min-width': '0',
              'text-align': 'left',
              padding: '8px',
              color: 'inherit',
              background: props.selected
                ? 'var(--v2-overlay-simple-overlay-hover, color-mix(in srgb, currentColor 8%, transparent))'
                : 'transparent',
              border: '0',
              'border-radius': '6px',
              cursor: props.result.disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <strong style={{ display: 'block', 'overflow-wrap': 'anywhere' }}>{props.result.title}</strong>
            <span style={{ display: 'block', opacity: 0.65, 'font-size': '12px', 'overflow-wrap': 'anywhere' }}>
              {props.result.disabled || props.result.description}
            </span>
            <Show when={props.busy}>
              <span role="status" style={{ display: 'inline-flex', gap: '6px', 'align-items': 'center' }}>
                <Loader size="small" />
                Working…
              </span>
            </Show>
          </button>
        }
      >
        <div
          style={{
            flex: '1',
            'min-width': '0',
            display: 'flex',
            gap: '8px',
            'align-items': 'center',
            'justify-content': 'space-between',
            'overflow-wrap': 'anywhere',
          }}
          aria-busy={props.busy}
        >
          <span style={{ 'min-width': '0' }}>
            <strong style={{ display: 'block' }}>{props.result.title}</strong>
            <span style={{ opacity: 0.65, 'font-size': '12px' }}>{props.result.description}</span>
          </span>
          <GuiPendingSwitch
            ui={props.ui}
            busy={props.busy}
            label={props.result.title}
            checked={props.result.group === 'MCP' && props.result.connected === true}
            disabled={Boolean(props.result.disabled || props.busy)}
            onChange={props.run}
          />
        </div>
      </Show>
      <Show when={props.result.information}>
        <Button size="small" variant="ghost" onClick={props.information}>
          Info
        </Button>
      </Show>
      <Show when={props.favorite !== undefined}>
        <Button size="small" variant="ghost" onClick={props.toggleFavorite}>
          {props.favorite ? 'Unbookmark' : 'Bookmark'}
        </Button>
      </Show>
    </li>
  )
}
