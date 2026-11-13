import type { ExecuteRun } from '../../features/code-mode/model'
import type { SessionMessageInfo } from '@opencode/client'

export function nativeExecuteRuns(messages: SessionMessageInfo[], boundary?: string): ExecuteRun[] {
  const index = boundary ? messages.findIndex((message) => message.id === boundary) : -1

  return (index < 0 ? messages : messages.slice(0, index))
    .flatMap((message) =>
      message.type === 'assistant'
        ? message.content.flatMap((part) => {
            if (part.type !== 'tool' || part.name !== 'execute') return []

            return [
              {
                id: `${message.id}:${part.id}`,
                messageID: message.id,
                status: part.state.status,
                created: part.time.created,
                started: part.time.ran,
                completed: part.time.completed,
                input: part.state.input,
                output: 'content' in part.state ? part.state.content : undefined,
                error: 'error' in part.state ? part.state.error : undefined,
                nested: 'unavailable' as const,
              },
            ]
          })
        : [],
    )
    .sort((left, right) => right.created - left.created || left.id.localeCompare(right.id))
}
