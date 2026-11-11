import { createMemo, onCleanup } from 'solid-js'

import { createProviderLimitsController } from '../../../entities/provider-limit/model'
import { bindCodexAccount, createLimitsRefresh } from '../../../features/provider-limits/model'

import { createGuiAccountSource } from './account-source'
import { createGuiCodexAdapter } from './codex'
import { createGuiNativeQuotaAdapter } from './native-quota'
import { subscribeGuiQuotaEvents } from './quota-events'

import type { PreferencesController } from '../../../entities/preferences/model'
import type { SelectedModel } from '../../../entities/provider-limit/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'
import type { Context } from '@opencode/plugin/gui'

export function createGuiLimits(
  context: Context,
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
  signal: AbortSignal,
  preferences?: PreferencesController,
) {
  const identities = new WeakMap<object, number>()
  let identity = 0
  const revision = (value: object) => {
    if (!identities.has(value)) identities.set(value, ++identity)

    return identities.get(value)!
  }
  const raw = createMemo<SelectedModel | undefined>(() => {
    if (!access.current(scope)) return

    const model = context.screen.current()?.composer.model()
    const request = access.cache(scope)

    return (
      model && {
        ...model,
        sessionID: scope.target.sessionID,
        quotaContext: JSON.stringify([scope.target.sessionKey, revision(request.client), revision(request.data)]),
      }
    )
  })
  const accounts = createGuiAccountSource(context, access, scope, signal)
  const selected = createMemo(() => {
    const model = raw()

    // Private bindings belong to a verified local connection, not a remote
    // provider with the same name. Remote identity is owned by its server RPC.
    return model && (accounts ? bindCodexAccount(accounts.current(model), preferences) : model)
  })
  const codex = accounts && createGuiCodexAdapter(context, access, scope, selected, accounts)
  const adapter = createGuiNativeQuotaAdapter(access, scope)
  const controller = createProviderLimitsController(
    [...(codex ? [codex] : []), adapter],
    selected,
    signal,
    accounts &&
      (async () => {
        const model = raw()

        if (model) await accounts.refresh(model)
      }),
  )

  createLimitsRefresh({
    controller,
    selectedModel: raw,
    accountSource: accounts,
    refreshMinutes: preferences?.limitsRefreshMinutes,
  })
  subscribeGuiQuotaEvents(access, scope, controller, signal)
  onCleanup(() => {
    controller.dispose()
    accounts?.dispose()
  })

  function command(id: string) {
    if (access.current(scope) && !context.commands.run(id))
      context.toast.show({ title: 'This model control is unavailable in the current session.', variant: 'error' })
  }

  return {
    controller,
    codex,
    accountSource: accounts,
    selected,
    label: () => {
      const model = selected()

      return model ? `[${model.providerID}] ${model.modelID}` : 'Select model'
    },
    chooseModel: () => command('model.choose'),
    chooseVariant: () => command('model.variant.cycle'),
  }
}
