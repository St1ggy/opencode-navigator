import type { SelectedModel } from '../../entities/provider-limit'
import type { Plugin } from '@opencode/plugin/tui'

export function selectedV2Model(context: Plugin.Context): SelectedModel | undefined {
  const route = context.ui.router.current()
  const model = context.ui.model.current()

  if (route.type !== 'session' || !model) return

  return {
    sessionID: route.sessionID,
    providerID: model.providerID,
    modelID: model.modelID,
    ...(model.variant && { variant: model.variant }),
  }
}
