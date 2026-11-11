import { Show } from 'solid-js'

import { useNavigatorGui } from './context'

import type { SidebarSection } from '../../../../shared/config'
import type { JSX } from 'solid-js'

export function MonitoringSection(props: {
  id: SidebarSection
  title: string
  count?: number
  actions?: JSX.Element
  children: JSX.Element
}) {
  const services = useNavigatorGui()
  const preferences = () => services.runtime.catalogs?.preferences
  const expanded = () => preferences()?.expanded()[props.id] ?? true
  const Icon = services.ui.Icon

  return (
    <section aria-label={props.title} style={{ 'min-width': '0' }}>
      <div style={{ display: 'flex', gap: '8px', 'align-items': 'center', 'min-width': '0' }}>
        <h2 style={{ flex: '1', 'min-width': '0', 'font-size': '13px', 'font-weight': '600', margin: '0' }}>
          <button
            type="button"
            aria-expanded={expanded()}
            onClick={() => preferences()?.toggleSectionExpanded(props.id)}
            style={{
              display: 'flex',
              gap: '6px',
              'align-items': 'center',
              width: '100%',
              padding: '3px 0',
              color: 'inherit',
              background: 'transparent',
              border: '0',
              'text-align': 'left',
            }}
          >
            <span
              aria-hidden="true"
              data-navigator-disclosure
              style={{
                display: 'inline-flex',
                width: '16px',
                height: '16px',
                'flex-shrink': '0',
                'align-items': 'center',
                'justify-content': 'center',
                transform: expanded() ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
            >
              <Icon name="chevron-down" size="small" />
            </span>
            <span style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
              {props.title}
            </span>
            <span style={{ opacity: 0.55, 'font-weight': '400' }}>{props.count}</span>
          </button>
        </h2>
        {props.actions}
      </div>
      <Show when={expanded()}>{props.children}</Show>
    </section>
  )
}
