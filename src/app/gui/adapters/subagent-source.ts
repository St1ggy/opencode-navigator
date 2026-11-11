import { createSignal } from 'solid-js'

import { createNativeSubagentSource } from '../../native/subagent-source'

import type { SubagentSession, SubagentStatus } from '../../../entities/subagent/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

export function createGuiSubagentSource(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
) {
  const projections = new WeakMap<object, SubagentSession>()
  const [observed, setObserved] = createSignal<Record<string, SubagentStatus>>({})
  const data = () => access.cache(scope).data
  const source = createNativeSubagentSource({
    sessions: () => data().session,
    client: () => access.read(scope).client,
    project(info) {
      let value = projections.get(info)

      if (!value) {
        value = {
          get id() {
            return info.id
          },
          get parentID() {
            return info.parentID
          },
          get title() {
            return info.title ?? 'Untitled session'
          },
          get directory() {
            return info.location.directory
          },
          get metadata() {
            return info.metadata
          },
          get time() {
            return info.time
          },
        }
        projections.set(info, value)
      }

      return value
    },
    status(id): SubagentStatus {
      if (!access.current(scope)) return { type: 'idle' }

      if (observed()[id]) return observed()[id]

      const sessions = data().session

      if (sessions.status(id) !== 'running') return { type: 'idle' }

      const messages = sessions.message.list(id)

      for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index]

        if (message.type !== 'assistant' || message.time.completed) continue

        if (message.retry)
          return {
            type: 'retry',
            attempt: message.retry.attempt,
            next: message.retry.at,
            message: message.retry.error.message,
          }

        break
      }

      return { type: 'busy' }
    },
  })

  return {
    ...source,
    list(parentID: string) {
      if (parentID !== scope.target.sessionID) throw new DOMException('Subagent parent changed', 'AbortError')

      return access.current(scope) ? source.list(parentID) : []
    },
    startedAt: (id: string) => (access.current(scope) ? source.startedAt?.(id) : undefined),
    observeStatus: (id: string, status: SubagentStatus) => setObserved((value) => ({ ...value, [id]: status })),
    clearObservedStatuses: () => setObserved({}),
    async refresh(parentID: string, signal: AbortSignal) {
      if (parentID !== scope.target.sessionID) throw new DOMException('Subagent parent changed', 'AbortError')

      const request = access.read(scope)

      await source.refresh(parentID, signal)

      if (!request.current()) throw new DOMException('Subagent connection changed', 'AbortError')
    },
  }
}
