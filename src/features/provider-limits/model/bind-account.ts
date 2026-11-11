import type { PreferencesController } from '../../../entities/preferences/model'
import type { SelectedModel } from '../../../entities/provider-limit/model'

export function bindCodexAccount(
  model: SelectedModel,
  preferences?: Pick<PreferencesController, 'codexAccountForConnection'>,
): SelectedModel {
  const connection = model.hostConnection

  if ((model.providerID !== 'openai' && connection?.providerID !== 'openai') || connection?.method === 'api')
    return { ...model, accountID: undefined, accountSource: undefined }

  if (connection && connection.status !== 'ready') return { ...model, accountID: undefined, accountSource: undefined }

  const accountID =
    connection?.accountID ?? preferences?.codexAccountForConnection(model.providerID, connection?.id, model.modelID)
  const accountSource = connection?.accountID ? 'host' : 'binding'

  return { ...model, accountID, accountSource: accountID ? accountSource : undefined }
}
