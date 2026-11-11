import { randomUUID } from 'node:crypto'

import { previewProjectProfile, saveProjectProfile } from '../../../entities/preferences/server'
import { NavigatorProfilesRpc } from '../rpc'

import { readServerConfiguredDefaults } from './configured-defaults'

import type { Context } from '@opencode/plugin/promise/plugin'

export async function setupProjectProfileServer(host: Context) {
  const previews = new Map<
    string,
    { sessionID: string; created: number; value: Awaited<ReturnType<typeof previewProjectProfile>> }
  >()

  async function verify(sessionID: string, signal: AbortSignal) {
    signal.throwIfAborted()

    if (host.location.workspaceID)
      throw new Error('Project profile writes require a server-owned directory, not a workspace-placed filesystem.')

    const session = await host.session.get({ sessionID })

    signal.throwIfAborted()

    if (session.location.directory !== host.location.directory)
      throw new Error('Project profile session location changed. Reopen the preview.')
  }

  const rpc = await host.rpc.register(NavigatorProfilesRpc, {
    defaults: async (input, context) => {
      const value = input as { sessionID?: string }

      if (value.sessionID) {
        const session = await host.session.get({ sessionID: value.sessionID })

        if (session.location.directory !== host.location.directory)
          throw new Error('Configuration session location changed.')
      }

      context.signal.throwIfAborted()
      const result = await readServerConfiguredDefaults(host, Boolean(value.sessionID))

      context.signal.throwIfAborted()

      return JSON.stringify(result)
    },
    preview: async (input, context) => {
      const value = input as { sessionID: string; name: string; source: string; replace?: boolean }

      await verify(value.sessionID, context.signal)
      const preview = await previewProjectProfile(host.location.directory, value.name, value.source, value.replace)

      context.signal.throwIfAborted()
      const token = randomUUID()

      previews.set(token, { sessionID: value.sessionID, created: Date.now(), value: preview })

      if (previews.size > 20) previews.delete(previews.keys().next().value!)

      return { token, after: preview.after, file: '.opencode/navigator.json' }
    },
    save: async (input, context) => {
      const value = input as { sessionID: string; token: string }
      const preview = previews.get(value.token)

      if (!preview || preview.sessionID !== value.sessionID || Date.now() - preview.created > 300_000)
        throw new Error('Project profile preview expired. Review the file again.')

      await verify(value.sessionID, context.signal)
      previews.delete(value.token)
      await saveProjectProfile(preview.value, host.location.directory)
      context.signal.throwIfAborted()

      return { file: '.opencode/navigator.json' }
    },
  })

  return async () => {
    previews.clear()
    await rpc.dispose()
  }
}
