import { providerAccountIdentity } from '../../../entities/provider-limit/model'

import type { HostProviderConnection } from '../../../entities/provider-limit/model'
import type { LocalAccountTarget } from '../ipc/local-account'
import type { MainContext } from '@opencode/plugin/gui/main'

export function createMainAccountReader(context: MainContext) {
  return async (target: LocalAccountTarget, caller: { signal: AbortSignal }): Promise<HostProviderConnection> => {
    const endpoint = context.serverEndpoints.get(target.serverID)

    // Only the host-verified app server shares this machine's Codex installation.
    // A loopback URL or a renderer's claim of locality is not sufficient.
    if (target.serverID !== 'sidecar' || !endpoint?.sameMachine || endpoint.id !== target.serverID)
      return { status: 'unsupported' }

    if (!target.directory || !target.sessionID || !target.providerID)
      throw new Error('Provider account target is incomplete')

    const client = context.client
    const url = endpoint.url
    const signal = AbortSignal.any([context.signal, caller.signal, AbortSignal.timeout(10_000)])
    const options = { signal }
    const session = await client.session.get({ sessionID: target.sessionID }, options)

    signal.throwIfAborted()

    if (session.id !== target.sessionID || session.location.directory !== target.directory)
      throw new DOMException('Provider account session location changed', 'AbortError')

    const [provider, credentials] = await Promise.all([
      client.provider.get(
        {
          providerID: target.providerID,
          location: {
            directory: session.location.directory,
            ...(target.workspace && { workspaceID: target.workspace }),
          },
        },
        options,
      ),
      client.credential.list(options),
    ])

    signal.throwIfAborted()
    const current = context.serverEndpoints.get(target.serverID)

    if (context.client !== client || !current?.sameMachine || current.id !== target.serverID || current.url !== url)
      throw new DOMException('Provider account server connection changed', 'AbortError')

    if (provider.data.id !== target.providerID) return { status: 'unavailable' }

    // This whitelist projection never sends credential values, headers or provider DTOs to the renderer.
    return providerAccountIdentity(provider.data, credentials)
  }
}
