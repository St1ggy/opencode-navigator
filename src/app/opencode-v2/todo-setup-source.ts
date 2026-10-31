import { posix, win32 } from 'node:path'

import type { TodoSetupSource } from '../../features/native-todo-setup'
import type { Plugin } from '@opencode/plugin/tui'

const location = (directory: string) => ({ directory })

function configFile(path: string) {
  const paths = /^[a-z]:[\\/]|^\\\\/iu.test(path) ? win32 : posix

  if (!paths.isAbsolute(path)) throw new Error('OpenCode returned a non-absolute configuration path.')

  // Reads are location-confined. Use the selected file's server-side parent,
  // without changing the session target or touching the client's filesystem.
  return { location: location(paths.dirname(path)), path: paths.basename(path) }
}

export function createTodoSetupSource(context: Plugin.Context): TodoSetupSource {
  return {
    async entries(target, signal) {
      const entries = await context.client.config.get({ location: location(target.routing.directory) }, { signal })

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
    async read(_target, path, signal) {
      const bytes = await context.client.file.read(configFile(path), { signal })

      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    },
    async write(_target, path, text, signal) {
      await context.client.experimental.file.write(
        { ...configFile(path), payload: new TextEncoder().encode(text) },
        { signal },
      )
    },
    subscribe(refresh) {
      const changed = context.data.on('config.updated', (event) => refresh(event.location?.directory))
      const connected = context.data.on('server.connected', () => refresh())

      return () => {
        changed()
        connected()
      }
    },
  }
}
