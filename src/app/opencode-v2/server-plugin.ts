import { Plugin } from '@opencode/plugin'

import { LegacyTodoArchiveRpc, readLegacyTodoArchive } from '../../entities/todo/server'
import { setupProviderQuotaServer } from '../../features/provider-limits/server'

export default Plugin.define({
  // Retain the historical ID so existing plugin-scoped archive data stays readable.
  id: 'opencode-navigator.todo-server',
  async setup(host) {
    const archive = await host.rpc.register(LegacyTodoArchiveRpc, {
      list: async (value) =>
        readLegacyTodoArchive((key) => host.storage.get(key), (value as { sessionID: string }).sessionID),
    })
    const quotaCleanup =
      typeof host.integration?.connection?.active === 'function' && typeof host.provider?.get === 'function'
        ? await setupProviderQuotaServer(host)
        : undefined

    return async () => {
      await quotaCleanup?.()
      await archive.dispose()
    }
  },
})
