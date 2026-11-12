import type { HostProviderConnection } from './types'

type AccountProvider = {
  id: string
  canonical?: string
  integrationID?: string
  activation?: string
  headers?: Readonly<Record<string, string>>
}
type AccountCredential = {
  id: string
  integrationID: string
  active: boolean
  value: { type: string; methodID?: string; metadata?: Readonly<Record<string, unknown>> }
}
const CHATGPT_METHODS = new Set(['chatgpt-browser', 'chatgpt-headless', 'chatgpt-token-sharing'])

export function providerAccountIdentity(
  provider: AccountProvider,
  credentials: readonly AccountCredential[],
): HostProviderConnection {
  if (!provider.integrationID || provider.activation === 'disabled') return { status: 'unsupported' }

  const active = credentials.filter((entry) => entry.integrationID === provider.integrationID && entry.active)

  if (active.length !== 1) return { status: 'unavailable' }

  const credential = active[0]
  const id = `credential:${credential.id}`

  if (credential.value.type === 'external') return { status: 'unsupported', id }

  const providerID = provider.canonical ?? provider.id

  if (credential.value.type === 'key') return { status: 'ready', id, method: 'api', providerID }

  if (provider.integrationID !== 'openai') return { status: 'ready', id, method: 'oauth', providerID }

  if (!credential.value.methodID || !CHATGPT_METHODS.has(credential.value.methodID))
    return { status: 'unsupported', id }

  const account = credential.value.metadata?.accountID
  const accountID = typeof account === 'string' && account.trim() ? account : undefined
  const header = Object.entries(provider.headers ?? {}).find(
    ([name]) => name.toLowerCase() === 'chatgpt-account-id',
  )?.[1]

  // A credential switch can precede catalog reload. Never reuse the previous account's header.
  if (accountID && header && header !== accountID) return { status: 'loading' }

  return { status: 'ready', id, method: 'oauth', providerID, ...(accountID && { accountID }) }
}
