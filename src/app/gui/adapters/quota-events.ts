import { createEffect, onCleanup, untrack } from 'solid-js'

import { NavigatorQuotaRpc } from '../../../entities/provider-limit/server'

import type { ProviderLimitsController } from '../../../entities/provider-limit/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'

export function subscribeGuiQuotaEvents(
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
  controller: ProviderLimitsController,
  signal: AbortSignal,
) {
  createEffect(() => {
    if (signal.aborted || !access.current(scope)) return

    const request = access.cache(scope)
    const stop = request.client.rpc(NavigatorQuotaRpc).events.on('updated', (event) =>
      untrack(() => {
        if (
          signal.aborted ||
          !request.current() ||
          event.location.directory !== scope.target.directory ||
          // The published event carries a public directory, not a workspace id.
          // Do not attribute same-directory workspace observations without that identity.
          Boolean(scope.target.workspace)
        )
          return

        const { model, adapter } = controller.current()

        if (
          model &&
          adapter?.id === 'provider-api' &&
          model.providerID === event.data.providerID &&
          model.modelID === event.data.modelID
        )
          void controller.refresh()
      }),
    )

    onCleanup(stop)
  })
}
