import { normalizeProviderQuota } from '../../../entities/provider-limit/model'
import { supportsCodexQuota } from '../../../features/provider-limits/model'
import { localCodexIpc } from '../ipc/local-codex'

import type {
  ProviderAccountSource,
  ProviderQuotaAdapter,
  ProviderQuotaSnapshot,
  SelectedModel,
} from '../../../entities/provider-limit/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'
import type { Context } from '@opencode/plugin/gui'

function snapshot(value: string, model: SelectedModel) {
  return normalizeProviderQuota({ ...(JSON.parse(value) as ProviderQuotaSnapshot), model })
}

export function createGuiCodexAdapter(
  context: Context,
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
  selected: () => SelectedModel | undefined,
  accounts: ProviderAccountSource,
): ProviderQuotaAdapter {
  const ipc = context.main(localCodexIpc(context.id))
  const matches = (model: SelectedModel) => JSON.stringify(selected()) === JSON.stringify(model)
  const target = (model: SelectedModel) => ({
    serverID: scope.target.serverID,
    sessionID: scope.target.sessionID,
    directory: scope.target.directory,
    ...(scope.target.workspace && { workspace: scope.target.workspace }),
    providerID: model.providerID,
    modelID: model.modelID,
    ...(model.variant && { variant: model.variant }),
    ...(model.accountID && { accountID: model.accountID }),
    ...(model.hostConnection?.id && { connectionID: model.hostConnection.id }),
  })

  async function run<T>(model: SelectedModel, signal: AbortSignal, operation: () => Promise<T>) {
    signal.throwIfAborted()

    if (!context.sessions.current()?.server.local || !matches(model))
      throw new DOMException('Local Codex target changed', 'AbortError')

    const request = access.read(scope)
    const value = await operation()

    signal.throwIfAborted()

    if (!request.current() || !matches(model)) throw new DOMException('Local Codex target changed', 'AbortError')

    return value
  }

  return {
    id: 'codex',
    name: 'Codex CLI',
    supports: (model) =>
      Boolean(context.sessions.current()?.server.local && model.hostConnection) && supportsCodexQuota(model),
    validateHost: accounts.validate,
    async discoverAccount(signal) {
      const model = selected()

      if (!model) throw new Error('Select a model first')

      const value = await run(model, signal, () => ipc.discover(target(model), { signal }))

      if (value.connectionID !== model.hostConnection?.id)
        throw new DOMException('Codex connection changed', 'AbortError')

      return value.accountID
    },
    async read(model, signal) {
      return snapshot(await run(model, signal, () => ipc.read(target(model), { signal })), model)
    },
    async prepareResetCreditConsumption(model, creditID, signal) {
      return snapshot(
        await run(model, signal, () =>
          ipc.prepare({ target: target(model), ...(creditID && { creditID }) }, { signal }),
        ),
        model,
      )
    },
    async consumeResetCredit(model, attempt, signal) {
      if (attempt.accountID !== model.accountID) throw new Error('Codex account changed')

      return run(model, signal, () =>
        ipc.consume(
          { target: target(model), idempotencyKey: attempt.idempotencyKey, uncertain: Boolean(attempt.uncertain) },
          { signal },
        ),
      )
    },
  }
}
