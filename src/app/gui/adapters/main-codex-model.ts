import { codexBindingAccount } from '../../../entities/preferences/model'

import { createMainAccountReader } from './main-account'

import type { PreferencesStore } from '../../../entities/preferences/model'
import type { SelectedModel } from '../../../entities/provider-limit/model'
import type { LocalAccountTarget } from '../ipc/local-account'
import type { MainContext } from '@opencode/plugin/gui/main'

export type MainCodexTarget = LocalAccountTarget & {
  modelID: string
  variant?: string
  accountID?: string
  connectionID?: string
}

export function createMainCodexModel(context: MainContext, store: PreferencesStore) {
  const account = createMainAccountReader(context)

  return async (target: MainCodexTarget, signal: AbortSignal): Promise<SelectedModel> => {
    const hostConnection = await account(target, { signal })

    if (
      hostConnection.status !== 'ready' ||
      hostConnection.method !== 'oauth' ||
      hostConnection.providerID !== 'openai' ||
      !hostConnection.id
    )
      throw new Error('Local Codex quotas require a verified ChatGPT connection on this Desktop server')

    if (target.connectionID && target.connectionID !== hostConnection.id)
      throw new DOMException('Codex host connection changed', 'AbortError')

    const document = await store.load()
    const confirmed = codexBindingAccount(
      document.user.codexAccountBindings ?? {},
      {
        providerID: target.providerID,
        connectionID: hostConnection.id,
      },
      target.modelID,
    )
    const accountID = hostConnection.accountID ?? confirmed

    signal.throwIfAborted()

    if (target.accountID && target.accountID !== accountID)
      throw new DOMException('Codex account binding changed', 'AbortError')

    return {
      providerID: target.providerID,
      modelID: target.modelID,
      sessionID: target.sessionID,
      ...(target.variant && { variant: target.variant }),
      hostConnection,
      ...(accountID && { accountID, accountSource: hostConnection.accountID ? 'host' : 'binding' }),
    }
  }
}
