import { createProviderLimitsController } from '../entities/provider-limit'
import {
  createCodexAppServerClient,
  createCodexQuotaAdapter,
  createNativeQuotaAdapter,
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
  const accountSource = context ? createOpenCodeV2AccountSource(context, api.lifecycle.signal) : undefined
  const codex = createCodexQuotaAdapter(createCodexAppServerClient({ version }), accountSource?.validate)
  const native = context ? createNativeQuotaAdapter(context) : undefined
  const controller = createProviderLimitsController(
    [codex, ...(native ? [native.adapter] : [])],
    () => {
      const model = selectModel()

      return model ? bindCodexAccount(accountSource?.current(model) ?? model, preferences) : undefined
    },
    api.lifecycle.signal,
    accountSource &&
      (async () => {
        const model = selectModel()

        if (model) await accountSource.refresh(model)
      }),
  )

  native?.onUpdated((providerID, modelID) => {
    const selected = selectModel()

    if (selected?.providerID === providerID && selected.modelID === modelID) void controller.refresh()
  })

  return {
    controller,
    codex,
    accountSource,
    selectModel,
    modelSelection: createLimitsModelSelection(api, selectModel, context),
  }
}
