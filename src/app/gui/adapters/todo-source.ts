import { nativeTodos } from '../../native/native-todos'
import { sessionMessagesUnavailable } from '../../native/session-message-capability'

import type { TodoSource } from '../../../entities/todo/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

export function createGuiTodoSource(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
): TodoSource {
  const unavailable = () => (access.current(scope) ? sessionMessagesUnavailable(access.cache(scope).data) : undefined)

  function list(sessionID: string) {
    if (sessionID !== scope.target.sessionID) throw new DOMException('Todo session changed', 'AbortError')

    if (!access.current(scope)) return []

    const { data } = access.cache(scope)

    if (sessionMessagesUnavailable(data)) return []

    return nativeTodos(data.session.message.list(sessionID), data.session.get(sessionID)?.revert?.messageID)
  }

  return {
    unavailable,
    list,
    async refresh(sessionID, signal) {
      if (sessionID !== scope.target.sessionID) throw new DOMException('Todo session changed', 'AbortError')

      signal.throwIfAborted()
      const request = access.read(scope)
      const reason = sessionMessagesUnavailable(request.data)

      if (reason) throw new Error(reason)

      await Promise.all([request.data.session.sync(sessionID), request.data.session.message.sync(sessionID)])
      signal.throwIfAborted()

      if (!request.current()) throw new DOMException('Todo connection changed', 'AbortError')

      return list(sessionID)
    },
  }
}
