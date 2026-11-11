import { todoPresentation } from './todo-presentation'
import { TodoStatusIcon } from './todo-status-icon'

import type { SidebarTodo } from '../../../../entities/todo/model'

export function TodoRow(props: { item: SidebarTodo }) {
  const appearance = () => todoPresentation(props.item.status)

  return (
    <li
      data-navigator-todo-row
      data-status={props.item.status}
      style={{ display: 'flex', 'align-items': 'flex-start', gap: '8px', padding: '4px 6px', 'min-width': '0' }}
    >
      <TodoStatusIcon status={props.item.status} />
      <span
        dir="auto"
        data-navigator-todo-text
        style={{
          flex: '1',
          'min-width': '0',
          'overflow-wrap': 'anywhere',
          'font-size': '13px',
          'line-height': 'var(--line-height-base)',
          'letter-spacing': '-0.04px',
          color: appearance().text,
          'text-decoration': appearance().decoration,
        }}
      >
        {props.item.content}
      </span>
    </li>
  )
}
