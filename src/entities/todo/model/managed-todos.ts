import { type NavigatorTodoItem, type NavigatorTodoState, normalizeTodoState } from './navigator-state'

type Storage = {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: NavigatorTodoState) => Promise<void>
}

function key(sessionID: string) {
  return `session.todo.${sessionID}`
}

export function createManagedTodos(
  storage: Storage,
  onChange: (sessionID: string, state: NavigatorTodoState) => Promise<void>,
) {
  const pending = new Map<string, Promise<unknown>>()

  async function list(sessionID: string) {
    return normalizeTodoState(await storage.get(key(sessionID)))
  }

  function change(sessionID: string, apply: (state: NavigatorTodoState) => NavigatorTodoState) {
    const request = (pending.get(sessionID) ?? Promise.resolve())
      .catch(() => {})
      .then(async () => {
        const next = apply(await list(sessionID))

        await storage.set(key(sessionID), next)
        await onChange(sessionID, next)

        return next
      })

    pending.set(sessionID, request)
    const clear = () => {
      if (pending.get(sessionID) === request) pending.delete(sessionID)
    }

    void request.then(clear).catch(clear)

    return request
  }

  return {
    list,
    replace(sessionID: string, todos: NavigatorTodoItem[]) {
      return change(sessionID, (current) => ({ ...current, todos: normalizeTodoState({ todos }).todos }))
    },
    guidance(sessionID: string, enabled: boolean) {
      return change(sessionID, (current) => ({ ...current, guidance: enabled }))
    },
  }
}
