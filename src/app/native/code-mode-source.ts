import { serverFileTarget } from '../../shared/lib/server-file'

import { nativeExecuteRuns } from './code-mode-runs'
import { configurationFileCapabilities } from './configuration-file-capabilities'
import { sessionMessagesUnavailable } from './session-message-capability'

import type { CodeModeSource, CodeModeTarget } from '../../features/code-mode/model'
import type { OpenCodeClient } from '@opencode/client'
import type { Plugin } from '@opencode/plugin/tui'

export function createNativeCodeModeSource(
  target: CodeModeTarget,
  access: (requireConnection?: boolean) => {
    client: OpenCodeClient
    data: Plugin.Context['data']
    current(): boolean
  },
): CodeModeSource {
  function isCurrent() {
    try {
      return access().current()
    } catch {
      return false
    }
  }
  function request() {
    const current = access()

    if (!current.current()) throw new Error('Code Mode server or location changed.')

    return current
  }

  async function read<T>(signal: AbortSignal, run: (client: OpenCodeClient) => Promise<T>) {
    const current = request()

    signal.throwIfAborted()
    const result = await run(current.client)

    signal.throwIfAborted()

    if (!current.current()) throw new Error('Code Mode connection changed.')

    return result
  }
  function unavailable() {
    try {
      return sessionMessagesUnavailable(access(false).data, 'Code Mode activity')
    } catch {
      // A stale or disconnected target is not proof of a missing capability.
      return
    }
  }

  return {
    identity: () => request().client,
    get supported() {
      return !unavailable()
    },
    get reason() {
      return unavailable()
    },
    routingUnavailable() {
      try {
        return configurationFileCapabilities(access(false).client).edit
          ? undefined
          : 'This OpenCode server does not expose routing configuration editing.'
      } catch {
        // The connection guard reports stale or offline targets separately.
        return
      }
    },
    current: isCurrent,
    runs: () => {
      const data = request().data

      if (sessionMessagesUnavailable(data, 'Code Mode activity')) return []

      return nativeExecuteRuns(
        data.session.message.list(target.sessionID),
        data.session.get(target.sessionID)?.revert?.messageID,
      )
    },
    async refresh(signal) {
      const current = request()

      await Promise.all([
        current.data.session.sync(target.sessionID),
        current.data.session.message.sync(target.sessionID),
      ])
      signal.throwIfAborted()

      if (!current.current()) throw new Error('Code Mode connection changed.')
    },
    async entries(signal) {
      const entries = await read(signal, async (client) =>
        typeof client.config?.get === 'function'
          ? client.config.get({ location: { directory: target.directory } }, { signal })
          : [],
      )

      return entries.flatMap((entry) =>
        entry.type === 'document' ? [{ path: entry.path, servers: entry.info.mcp?.servers }] : [],
      )
    },
    async read(path, signal) {
      const bytes = await read(signal, (client) => {
        if (typeof client.file?.read !== 'function') throw new Error('This OpenCode server does not expose file reads.')

        return client.file.read(serverFileTarget(path), { signal })
      })

      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    },
    async write(path, text, signal) {
      await read(signal, (client) => {
        if (typeof client.experimental?.file?.write !== 'function')
          throw new Error('This OpenCode server does not expose routing configuration writes.')

        return client.experimental.file.write(
          { ...serverFileTarget(path), payload: new TextEncoder().encode(text) },
          { signal },
        )
      })
    },
    subscribe(listener) {
      const current = access(false)
      const unsubscribe = current.data.listen(({ details }) => {
        if (!isCurrent()) return

        if ('location' in details && details.location?.directory && details.location.directory !== target.directory)
          return

        if (
          'data' in details &&
          details.data &&
          typeof details.data === 'object' &&
          'sessionID' in details.data &&
          details.data.sessionID !== target.sessionID
        )
          return

        if (
          details.type.startsWith('session.message.') ||
          details.type.startsWith('session.tool.') ||
          details.type.startsWith('session.revert.')
        )
          listener('activity')
        else if (details.type === 'config.updated' || details.type === 'server.connected') listener('configuration')
      })

      return unsubscribe
    },
  }
}
