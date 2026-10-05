import type { SelectedModel } from '../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function selectedV1Model(api: TuiPluginApi): SelectedModel | undefined {
  const route = api.route.current
  const sessionID = 'params' in route ? route.params?.sessionID : undefined

  if (route.name !== 'session' || typeof sessionID !== 'string') return

  const model = api.state.session.get(sessionID)?.model

  if (!model) return

  return {
    sessionID,
    providerID: model.providerID,
    modelID: model.id,
    ...(model.variant && { variant: model.variant }),
  }
}
