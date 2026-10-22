import type { SidebarTodo } from '../../entities/todo'
import type { SessionMessageInfo } from '@opencode/client'

const statuses = new Set(['pending', 'in_progress', 'completed', 'cancelled'])

function parseTodos(value: unknown): SidebarTodo[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object' || !('content' in item) || typeof item.content !== 'string' || !item.content)
      return []

    const status =
      'status' in item && typeof item.status === 'string' && statuses.has(item.status) ? item.status : 'pending'

    return [{ content: item.content, status }]
  })
}

export function nativeTodos(messages: readonly SessionMessageInfo[], boundary?: string): readonly SidebarTodo[] {
  const boundaryIndex = boundary ? messages.findIndex((message) => message.id === boundary) : -1
  const end = boundaryIndex === -1 ? messages.length : boundaryIndex

  for (let index = end - 1; index >= 0; index--) {
    const message = messages[index]

    if (message.type !== 'assistant') continue

    for (let part = message.content.length - 1; part >= 0; part--) {
      const item = message.content[part]

      if (item.type === 'tool' && item.name === 'todowrite' && item.state.status === 'completed')
        return parseTodos(item.state.input.todos)
    }
  }

  return []
}
