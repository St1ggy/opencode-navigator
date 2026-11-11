import { createSignal } from 'solid-js'

import { GuardedConfirmation } from '../../../shared/ui'

import { CodexAccountMismatchError, createCodexAccountLinkModel } from './account-link-model'

import type { PreferencesController } from '../../../entities/preferences'
import type { ProviderQuotaAdapter, SelectedModel } from '../../../entities/provider-limit'
import type { DialogNavigation } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createCodexAccountLink(input: {
  api: TuiPluginApi
  preferences: PreferencesController
  adapter: ProviderQuotaAdapter
  model: () => SelectedModel | undefined
  dialogs: DialogNavigation
}) {
  const [busy, setBusy] = createSignal(false)

  async function link() {
    const selected = input.model()

    if (
      busy() ||
      !selected ||
      (selected.providerID !== 'openai' && selected.hostConnection?.providerID !== 'openai') ||
      !input.adapter.discoverAccount
    )
      return

    if (selected.hostConnection && selected.hostConnection.status !== 'ready') return

    const signal = input.api.lifecycle?.signal ?? new AbortController().signal
    const model = createCodexAccountLinkModel({
      adapter: input.adapter,
      selected: input.model,
      signal,
      bind: input.preferences.setCodexConnectionBinding,
    })
    const current = model.current

    setBusy(true)
    try {
      const preview = await model.discover()

      if (!preview) return

      const { accountID } = preview

      async function confirm() {
        if (busy() || !current()) return

        setBusy(true)
        try {
          if (await model.confirm({ accountID })) input.dialogs.back()
        } catch {
          if (current())
            input.api.ui.toast({
              variant: 'warning',
              title: 'Codex account',
              message: 'Account verification failed; try again.',
            })
        } finally {
          setBusy(false)
        }
      }

      input.dialogs.open(() => (
        <GuardedConfirmation
          api={input.api}
          current={current}
          title="Link Codex CLI account"
          message={`Use Codex CLI account ${accountID} for ${selected.providerID}${selected.hostConnection?.id ? ' connection' : ''} across models? Only confirm matching accounts.`}
          onConfirm={() => void confirm()}
        />
      ))
    } catch (error) {
      if (current())
        input.api.ui.toast({
          variant: 'warning',
          title: 'Codex account',
          message:
            error instanceof CodexAccountMismatchError
              ? error.message
              : 'Install a supported Codex CLI and sign in with ChatGPT, then try again.',
        })
    } finally {
      setBusy(false)
    }
  }

  return { link, busy }
}
