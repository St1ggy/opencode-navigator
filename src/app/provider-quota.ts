import { createProviderLimitsController } from '../entities/provider-limit'
import {
  createCodexAppServerClient,
  createCodexQuotaAdapter,
  createNativeQuotaAdapter,
  createOpenCodeUsageAdapter,
} from '../features/provider-limits'

import { bindCodexAccount } from './limits-account-model'
import { createLimitsModelSelection } from './limits-model-selection'
import { selectedV1Model } from './model-selection'
import { createOpenCodeV2AccountSource } from './opencode-v2/account-source'
import { selectedV2Model } from './opencode-v2/model-adapter'

import type { PreferencesController } from '../entities/preferences'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createProviderQuotaIntegration(
  api: TuiPluginApi,
  preferences: PreferencesController,
  version: string,
  context?: Plugin.Context,
) {
  const selectModel = () => (context ? selectedV2Model(context) : selectedV1Model(api))
  const hostAccounts = context ? createOpenCodeV2AccountSource(context, api.lifecycle.signal) : undefined
  const usage = context ? createOpenCodeUsageAdapter(context) : undefined
  const accountSource = hostAccounts && {
    ...hostAccounts,
    current(model: Parameters<typeof hostAccounts.current>[0]) {
      if (usage?.adapter.supports(model)) {
        hostAccounts.suspend?.()

        return usage.target(model)
      }

      return hostAccounts.current(model)
    },
    refresh(model: Parameters<typeof hostAccounts.refresh>[0]) {
      if (usage?.adapter.supports(model)) {
        hostAccounts.suspend?.()

        return Promise.resolve()
      }

      return hostAccounts.refresh(model)
    },
  }
  const codex = createCodexQuotaAdapter(createCodexAppServerClient({ version }), accountSource?.validate)
  const native = context ? createNativeQuotaAdapter(context) : undefined
  const controller = createProviderLimitsController(
    [...(usage ? [usage.adapter] : []), codex, ...(native ? [native.adapter] : [])],
    () => {
      const model = selectModel()

      if (!model) return

      const selected = accountSource?.current(model) ?? model

      return usage?.adapter.supports(model) ? selected : bindCodexAccount(selected, preferences)
    },
    api.lifecycle.signal,
    accountSource &&
      (async () => {
        const model = selectModel()

        if (model) await accountSource.refresh(model)
      }),
  )

  return {
    controller,
    codex,
    accountSource,
    selectModel,
    modelSelection: createLimitsModelSelection(api, selectModel, context),
  }
}
