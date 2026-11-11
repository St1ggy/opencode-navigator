import { Show } from 'solid-js'

import { GuiIconAction } from '../../../../shared/ui/gui'

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
  const Loader = props.ui.Loader

  return (
    <div
      data-navigator-panel
      style={{ display: 'flex', 'flex-direction': 'column', height: '100%', 'min-height': '0' }}
    >
      <header
        data-navigator-panel-header
        style={{ padding: '8px 12px', display: 'grid', gap: '6px', 'min-width': '0' }}
      >
        <strong
          data-navigator-session-title
          style={{
            'min-width': '0',
            overflow: 'hidden',
            'overflow-wrap': 'anywhere',
            display: '-webkit-box',
            '-webkit-line-clamp': '2',
            '-webkit-box-orient': 'vertical',
            'line-height': '20px',
          }}
          title={props.title}
        >
          {props.title}
        </strong>
        <div
          role="group"
          aria-label="Navigator actions"
          style={{ display: 'flex', gap: '4px', 'align-items': 'center', 'flex-wrap': 'wrap' }}
        >
          <GuiIconAction ui={props.ui} icon="magnifying-glass" label="Search" onClick={props.search} />
          <GuiIconAction
            ui={props.ui}
            icon="refresh"
            label="Refresh"
            onClick={() => void props.runtime?.refresh(true)}
          />
          <GuiIconAction ui={props.ui} icon="expand" label="Float" onClick={props.float} />
          <Show when={props.onSettings}>
            <GuiIconAction ui={props.ui} icon="settings-gear" label="Settings" onClick={props.onSettings} />
          </Show>
        </div>
      </header>
      <Show
        when={!props.floating}
        fallback={
          <div style={{ padding: '12px' }}>
            <p>Navigator is in its mini-window.</p>
            <GuiIconAction ui={props.ui} icon="layout-right" label="Dock Navigator" onClick={props.dock} />
          </div>
        }
      >
        <Show
          when={props.runtime}
          fallback={
            <p role="status">
              <Loader size="small" /> Loading Navigator…
            </p>
          }
        >
          {(runtime) => <MonitoringContent {...props} runtime={runtime()} />}
        </Show>
      </Show>
    </div>
  )
}
