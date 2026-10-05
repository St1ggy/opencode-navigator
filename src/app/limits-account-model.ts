import type { PreferencesController } from '../entities/preferences'
import type { SelectedModel } from '../entities/provider-limit'

export function bindCodexAccount(model: SelectedModel, preferences: PreferencesController): SelectedModel {
  const connection = model.hostConnection

  if ((model.providerID !== 'openai' && connection?.providerID !== 'openai') || connection?.method === 'api')
    return { ...model, accountID: undefined, accountSource: undefined }

  if (connection && connection.status !== 'ready') return { ...model, accountID: undefined, accountSource: undefined }

  const accountID =
    connection?.accountID ?? preferences.codexAccountForConnection(model.providerID, connection?.id, model.modelID)
  const accountSource = connection?.accountID ? 'host' : 'binding'

  return { ...model, accountID, accountSource: accountID ? accountSource : undefined }
}
