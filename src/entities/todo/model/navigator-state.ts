export type NavigatorTodoItem = {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority?: 'high' | 'medium' | 'low'
}

export type NavigatorTodoState = { todos: NavigatorTodoItem[]; guidance: boolean }

export function normalizeTodoState(value: unknown): NavigatorTodoState {
  if (!value || typeof value !== 'object') return { todos: [], guidance: false }

  const state = value as Partial<NavigatorTodoState>
  const statuses = new Set(['pending', 'in_progress', 'completed', 'cancelled'])
  const priorities = new Set(['high', 'medium', 'low'])
  const todos = Array.isArray(state.todos)
    ? state.todos
        .filter(
          (item): item is NavigatorTodoItem =>
            item &&
            typeof item.content === 'string' &&
            item.content.trim().length > 0 &&
            item.content.length <= 512 &&
            statuses.has(item.status),
        )
        .slice(0, 100)
        .map((item) => ({
          content: item.content.trim(),
          status: item.status,
          ...(priorities.has(item.priority ?? '') && { priority: item.priority }),
        }))
    : []

  return { todos, guidance: state.guidance === true }
}

export function todoGuidance(state: NavigatorTodoState) {
  const lines = state.todos.map((todo) => `- [${todo.status}] ${todo.content}`)

  return [
    'Navigator Todo: when work has multiple steps, use navigator_todo_write to keep the session Todo list current.',
    'Mark work in progress, completed, or cancelled as it changes; avoid claiming unfinished work is done.',
    ...(lines.length > 0 ? ['Current Navigator Todo items:', ...lines] : []),
  ].join('\n')
}
