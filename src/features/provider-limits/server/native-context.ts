import type { SelectedModel } from '../../../entities/provider-limit'
import type { ConnectionInfo, ProviderInfo } from '@opencode/client'
import type { Credential } from '@opencode/schema/credential'

export type NativeQuotaRequest = {
  model: SelectedModel
  apiModelID: string
  provider: ProviderInfo
  canonical: string
  connection: ConnectionInfo
  connectionID: string
  credential: Credential.Value
  token: string
  signal: AbortSignal
  fetcher: typeof fetch
}

export function connectionKey(connection: ConnectionInfo) {
  return connection.type === 'credential' ? `credential:${connection.id}` : `env:${connection.name}`
}

export function nativeBaseURL(provider: ProviderInfo) {
  return typeof provider.settings?.baseURL === 'string' ? provider.settings.baseURL : undefined
}

export function matchingOrigin(provider: ProviderInfo, origins: readonly string[]) {
  const configured = nativeBaseURL(provider)

  if (!configured) return true

  try {
    return origins.includes(new URL(configured).origin)
  } catch {
    return false
  }
}
