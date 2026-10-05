import type { HostProviderConnection } from '../../entities/provider-limit'
import type { CredentialEntry, ProviderInfo } from '@opencode/client'

const CHATGPT_METHODS = new Set(['chatgpt-browser', 'chatgpt-headless'])

export function providerAccountIdentity(
  provider: ProviderInfo,
  credentials: readonly CredentialEntry[],
): HostProviderConnection {
  if (!provider.integrationID || provider.activation === 'disabled') return { status: 'unsupported' }

  const active = credentials.filter((entry) => entry.integrationID === provider.integrationID && entry.active)

  if (active.length !== 1) return { status: 'unavailable' }

  const credential = active[0]
  const id = `credential:${credential.id}`

  const providerID = provider.canonical ?? provider.id

  if (credential.value.type === 'key') return { status: 'ready', id, method: 'api', providerID }

  if (provider.integrationID !== 'openai') return { status: 'ready', id, method: 'oauth', providerID }

  if (!CHATGPT_METHODS.has(credential.value.methodID)) return { status: 'unsupported', id }

  const account = credential.value.metadata?.accountID
  const accountID = typeof account === 'string' && account.trim() ? account : undefined
  const header = Object.entries(provider.headers ?? {}).find(
    ([name]) => name.toLowerCase() === 'chatgpt-account-id',
  )?.[1]

  // Credential selection can precede catalog reload. Never use the previous account's header.
  if (accountID && header && header !== accountID) return { status: 'loading' }

  return { status: 'ready', id, method: 'oauth', providerID, ...(accountID && { accountID }) }
}
