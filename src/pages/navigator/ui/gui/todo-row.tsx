import type { SidebarTodo } from '../../../../entities/todo/model'

export function TodoRow(props: { item: SidebarTodo }) {
  return (
    <li style={{ padding: '6px 0', 'overflow-wrap': 'anywhere' }}>
      <span role="img" aria-label={props.item.status} style={{ opacity: 0.6 }}>
        {props.item.status === 'completed' ? '✓ ' : props.item.status === 'in_progress' ? '◉ ' : '○ '}
      </span>
      {props.item.content}
    </li>
  )
}
