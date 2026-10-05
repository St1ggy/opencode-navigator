import { createSignal } from 'solid-js'

import { GuardedConfirmation } from '../../../shared/ui'

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

    const key = JSON.stringify(selected)
    const current = () => JSON.stringify(input.model()) === key
    const signal = input.api.lifecycle?.signal ?? new AbortController().signal
    const validHost = async () => !input.adapter.validateHost || (await input.adapter.validateHost(selected, signal))

    setBusy(true)
    try {
      if (!(await validHost()) || !current()) return

      const accountID = await input.adapter.discoverAccount(signal)

      if (!current()) return

      if (selected.hostConnection?.accountID && selected.hostConnection.accountID !== accountID) {
        input.api.ui.toast({
          variant: 'warning',
          title: 'Codex account',
          message: 'Sign in to Codex CLI with the account selected in OpenCode.',
        })

        return
      }

      async function confirm() {
        if (busy() || !current()) return

        setBusy(true)
        try {
          if (!(await validHost()) || !current()) return

          const latest = await input.adapter.discoverAccount!(signal)

          if (!current() || latest !== accountID) return

          input.preferences.setCodexConnectionBinding(selected!.providerID, selected!.hostConnection?.id, accountID)
          input.dialogs.back()
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
    } catch {
      if (current())
        input.api.ui.toast({
          variant: 'warning',
          title: 'Codex account',
          message: 'Install a supported Codex CLI and sign in with ChatGPT, then try again.',
        })
    } finally {
      setBusy(false)
    }
  }

  return { link, busy }
}
