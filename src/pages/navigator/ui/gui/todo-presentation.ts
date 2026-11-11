import type { SidebarTodo } from '../../../../entities/todo/model'

export function todoPresentation(status: SidebarTodo['status']) {
  const finished = status === 'completed' || status === 'cancelled'
  const activeText = status === 'in_progress' ? 'var(--v2-text-text-base)' : 'var(--v2-text-text-muted)'
  const inactiveIcon = status === 'completed' ? 'var(--v2-icon-icon-muted)' : 'var(--v2-icon-icon-faint)'

  return {
    decoration: finished ? 'line-through' : 'none',
    text: finished ? 'var(--v2-text-text-faint)' : activeText,
    icon: status === 'in_progress' ? 'var(--v2-state-fg-warning)' : inactiveIcon,
  }
}
