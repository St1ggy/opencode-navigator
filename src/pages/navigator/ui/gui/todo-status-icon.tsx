import { Match, Switch } from 'solid-js'

import { todoPresentation } from './todo-presentation'

import type { SidebarTodo } from '../../../../entities/todo/model'

// Desktop's task-status glyph is not exported by the public UI facade. Keep this
// fallback aligned with the audited native geometry and semantic tokens.
export function TodoStatusIcon(props: { status: SidebarTodo['status'] }) {
  const color = () => todoPresentation(props.status).icon

  return (
    <span
      role="img"
      aria-label={props.status}
      style={{ display: 'inline-flex', height: '20px', 'align-items': 'center', 'flex-shrink': '0', color: color() }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
        <Switch>
          <Match when={props.status === 'in_progress'}>
            <path d="M8 4a4 4 0 0 0 0 8V4Z" fill="currentColor" />
          </Match>
          <Match when={props.status === 'completed'}>
            <path d="M5 8 7.5 11 11 5.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
          </Match>
          <Match when={props.status === 'cancelled'}>
            <path d="M3.5 12.5 12.5 3.5" stroke="currentColor" />
          </Match>
        </Switch>
      </svg>
    </span>
  )
}
