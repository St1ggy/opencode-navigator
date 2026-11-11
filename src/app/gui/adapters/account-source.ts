import { createProviderAccountSource } from '../../../features/provider-limits/model'
import { localAccountIpc } from '../ipc/local-account'

import { subscribeGuiAccountEvents } from './account-events'

import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'
import type { Context } from '@opencode/plugin/gui'

export function createGuiAccountSource(
  context: Context,
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
  lifecycle: AbortSignal,
) {
  if (!context.sessions.current()?.server.local) return

  const ipc = context.main(localAccountIpc(context.id))

  return createProviderAccountSource({
    lifecycle,
    key: (model) => JSON.stringify([model.quotaContext, model.providerID]),
    async read(model, signal) {
      if (!context.sessions.current()?.server.local) return { status: 'unsupported' }

      const request = access.read(scope)
      const connection = await ipc.read(
        {
          serverID: scope.target.serverID,
          sessionID: scope.target.sessionID,
          directory: scope.target.directory,
          ...(scope.target.workspace && { workspace: scope.target.workspace }),
          providerID: model.providerID,
        },
        { signal },
      )

      signal.throwIfAborted()

      if (!request.current()) throw new DOMException('Provider account target changed', 'AbortError')

      return connection
    },
    subscribe: (invalidate) => subscribeGuiAccountEvents(access, scope, invalidate),
  })
}
