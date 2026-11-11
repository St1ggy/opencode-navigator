import { Show } from 'solid-js'

import { MonitoringContent } from './monitoring-content'

import type { MonitoringRuntime } from '../../model'
import type { NavigatorGuiServices } from './context'

export function MonitoringPanel(
  props: Omit<NavigatorGuiServices, 'runtime'> & {
    runtime?: MonitoringRuntime
    title: string
    floating: boolean
    float(): void
    dock(): void
    search(): void
    scrollTop?: number
    onScroll(top: number): void
  },
) {
  const Button = props.ui.Button

  return (
    <div
      data-navigator-panel
      style={{ display: 'flex', 'flex-direction': 'column', height: '100%', 'min-height': '0' }}
    >
      <header style={{ padding: '8px 12px', display: 'flex', gap: '4px', 'align-items': 'center' }}>
        <strong
          style={{
            flex: '1',
            'min-width': '0',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
          }}
          title={props.title}
        >
          {props.title}
        </strong>
        <Button size="small" variant="ghost" onClick={props.search}>
          Search
        </Button>
        <Button size="small" variant="ghost-muted" onClick={() => void props.runtime?.refresh(true)}>
          Refresh
        </Button>
        <Button size="small" variant="ghost" onClick={props.float}>
          Float
        </Button>
        <Show when={props.onSettings}>
          <Button size="small" variant="ghost" onClick={props.onSettings}>
            Settings
          </Button>
        </Show>
      </header>
      <Show
        when={!props.floating}
        fallback={
          <div style={{ padding: '12px' }}>
            <p>Navigator is in its mini-window.</p>
            <Button size="small" onClick={props.dock}>
              Dock Navigator
            </Button>
          </div>
        }
      >
        <Show when={props.runtime} fallback={<p role="status">Loading Navigator…</p>}>
          {(runtime) => <MonitoringContent {...props} runtime={runtime()} />}
        </Show>
      </Show>
    </div>
  )
}
