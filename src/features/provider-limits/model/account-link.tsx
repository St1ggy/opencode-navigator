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

    if (busy() || !selected || selected.providerID !== 'openai' || !input.adapter.discoverAccount) return

    const key = JSON.stringify(selected)
    const current = () => JSON.stringify(input.model()) === key

    setBusy(true)
    try {
      const accountID = await input.adapter.discoverAccount(input.api.lifecycle?.signal ?? new AbortController().signal)

      if (!current()) return

      input.dialogs.open(() => (
        <GuardedConfirmation
          api={input.api}
          current={current}
          title="Link Codex CLI account"
          message={`Use Codex CLI account ${accountID} for ${selected.modelID}? Only link accounts you know match this OpenCode provider.`}
          onConfirm={() => {
            if (!current()) return

            input.preferences.setCodexAccountBinding(selected.providerID, selected.modelID, accountID)
            input.dialogs.back()
          }}
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
