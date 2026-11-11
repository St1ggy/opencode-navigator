import type { ProviderQuotaAdapter, SelectedModel } from '../../../entities/provider-limit/model'

const alwaysCurrent = () => true

export class CodexAccountMismatchError extends Error {
  constructor() {
    super('Sign in to Codex CLI with the account selected in OpenCode.')
    this.name = 'CodexAccountMismatchError'
  }
}

export function canLinkCodexAccount(model: SelectedModel) {
  return (
    (model.providerID === 'openai' || model.hostConnection?.providerID === 'openai') &&
    model.hostConnection?.method !== 'api' &&
    (!model.hostConnection || model.hostConnection.status === 'ready')
  )
}

export function createCodexAccountLinkModel(input: {
  adapter: ProviderQuotaAdapter
  selected(): SelectedModel | undefined
  signal: AbortSignal
  current?: () => boolean
  bind(providerID: string, connectionID: string | undefined, accountID: string): void | Promise<void>
}) {
  const model = input.selected()
  const key = JSON.stringify(model)
  const current = () =>
    !input.signal.aborted && (input.current ?? alwaysCurrent)() && JSON.stringify(input.selected()) === key
  const validHost = async () =>
    Boolean(model && (!input.adapter.validateHost || (await input.adapter.validateHost(model, input.signal))))

  async function discover() {
    if (!model || !current() || !input.adapter.discoverAccount || !canLinkCodexAccount(model)) return

    if (!(await validHost()) || !current()) return

    const accountID = await input.adapter.discoverAccount(input.signal)

    if (!current()) return

    if (model.hostConnection?.accountID && model.hostConnection.accountID !== accountID)
      throw new CodexAccountMismatchError()

    return { accountID, model }
  }

  return {
    current,
    discover,
    async confirm(preview: { accountID: string }) {
      const latest = await discover()

      if (!latest || !current() || latest.accountID !== preview.accountID) return false

      await input.bind(latest.model.providerID, latest.model.hostConnection?.id, latest.accountID)

      return true
    },
  }
}
