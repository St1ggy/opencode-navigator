import { createEffect, onCleanup } from 'solid-js'

import { serverFileTarget } from '../../../shared/lib/server-file'

import type { TodoSetupSource } from '../../../features/native-todo-setup/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

const noop = () => {}

export function createGuiTodoSetupSource(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
): TodoSetupSource {
  function request(target: Parameters<TodoSetupSource['entries']>[0]) {
    if (
      target.key !== scope.target.sessionKey ||
      target.sessionID !== scope.target.sessionID ||
      target.routing.directory !== scope.target.directory ||
      target.routing.workspace !== scope.target.workspace
    )
      throw new DOMException('Todo configuration target changed', 'AbortError')

    return access.read(scope)
  }

  return {
    async entries(target, signal) {
      const current = request(target)
      const entries = await current.client.config.get({ location: current.location }, { signal })

      signal.throwIfAborted()

      if (!current.current()) throw new DOMException('Todo configuration connection changed', 'AbortError')

      return entries.flatMap((entry) =>
        entry.type === 'document'
          ? [
              {
                path: entry.path,
                experimental:
                  entry.info.experimental === undefined ? undefined : { todo: entry.info.experimental.todo },
              },
            ]
          : [],
      )
    },
    async read(target, path, signal) {
      const current = request(target)
      const bytes = await current.client.file.read(serverFileTarget(path), { signal })

      signal.throwIfAborted()

      if (!current.current()) throw new DOMException('Todo configuration connection changed', 'AbortError')

      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    },
    async write(target, path, text, signal) {
      const current = request(target)

      signal.throwIfAborted()
      await current.client.experimental.file.write(
        { ...serverFileTarget(path), payload: new TextEncoder().encode(text) },
        { signal },
      )
      signal.throwIfAborted()

      if (!current.current()) throw new DOMException('Todo configuration connection changed', 'AbortError')
    },
    subscribe(refresh) {
      let disposed = false
      let cleanup = noop

      createEffect(() => {
        if (disposed || !access.current(scope)) return

        const data = access.cache(scope).data
        const changed = data.on('config.updated', (event) => {
          if (access.current(scope)) refresh(event.location?.directory)
        })
        const connected = data.on('server.connected', () => {
          if (access.current(scope)) refresh()
        })

        cleanup = () => {
          changed()
          connected()
        }
        onCleanup(cleanup)
      })

      return () => {
        disposed = true
        cleanup()
      }
    },
  }
}
