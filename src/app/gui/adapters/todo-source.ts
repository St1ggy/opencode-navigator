import { nativeTodos } from '../../native/native-todos'

import type { TodoSource } from '../../../entities/todo/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

export function createGuiTodoSource(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
): TodoSource {
  function list(sessionID: string) {
    if (sessionID !== scope.target.sessionID) throw new DOMException('Todo session changed', 'AbortError')

    if (!access.current(scope)) return []

    const { data } = access.cache(scope)

    return nativeTodos(data.session.message.list(sessionID), data.session.get(sessionID)?.revert?.messageID)
  }

  return {
    list,
    async refresh(sessionID, signal) {
      if (sessionID !== scope.target.sessionID) throw new DOMException('Todo session changed', 'AbortError')

      signal.throwIfAborted()
      const request = access.read(scope)

      await Promise.all([request.data.session.sync(sessionID), request.data.session.message.sync(sessionID)])
      signal.throwIfAborted()

      if (!request.current()) throw new DOMException('Todo connection changed', 'AbortError')

      return list(sessionID)
    },
  }
}
