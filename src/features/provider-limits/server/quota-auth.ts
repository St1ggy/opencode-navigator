import { providerQuotaCapability } from '../model/provider-capabilities'

import { connectionKey } from './native-context'

import type { NativeQuotaRequest } from './native-context'
import type { SelectedModel } from '../../../entities/provider-limit'
import type { Context } from '@opencode/plugin/promise/plugin'

export async function nativeQuotaContext(
  host: Context,
  model: SelectedModel,
  signal: AbortSignal,
  fetcher: typeof fetch,
): Promise<NativeQuotaRequest | undefined> {
  const [provider, catalog] = await Promise.all([
    host.provider.get({ providerID: model.providerID }),
    host.model.list(),
  ])
  const selected = catalog.data.find(
    (entry) => entry.providerID === model.providerID && entry.id === model.modelID && entry.enabled,
  )

  if (!selected || !provider.data.integrationID || provider.data.activation === 'disabled') return

  const connection = await host.integration.connection.active(provider.data.integrationID)

  if (!connection) return

  const credential = await host.integration.connection.resolve(connection)
  const token = credential?.type === 'oauth' ? credential.access : credential?.key

  if (!credential || !token) return

  signal.throwIfAborted()

  return {
    model,
    apiModelID: selected.modelID,
    provider: provider.data,
    canonical: providerQuotaCapability(provider.data.id, provider.data.canonical).id,
    connection,
    connectionID: connectionKey(connection),
    credential,
    token,
    signal,
    fetcher,
  }
}

export async function sameNativeConnection(host: Context, input: NativeQuotaRequest) {
  const current =
    input.provider.integrationID && (await host.integration.connection.active(input.provider.integrationID))

  if (!current || connectionKey(current) !== input.connectionID) return false

  const credential = await host.integration.connection.resolve(current)
  const token = credential?.type === 'oauth' ? credential.access : credential?.key

  return token === input.token
}

export function requestUsesCredential(request: Request, input: NativeQuotaRequest) {
  const url = new URL(request.url)
  const origins: Record<string, string> = {
    openai: 'https://api.openai.com',
    anthropic: 'https://api.anthropic.com',
    groq: 'https://api.groq.com',
    cerebras: 'https://api.cerebras.ai',
    'fireworks-ai': 'https://api.fireworks.ai',
    google: 'https://generativelanguage.googleapis.com',
  }
  const cloudOrigin =
    url.protocol === 'https:' &&
    ((input.canonical === 'azure' && url.hostname.endsWith('.openai.azure.com')) ||
      (input.canonical === 'google-vertex' && url.hostname.endsWith('.aiplatform.googleapis.com')))

  if (!cloudOrigin && url.origin !== origins[input.canonical]) return false

  const authorization = request.headers.get('authorization')

  if (authorization === `Bearer ${input.token}` || authorization === `bearer ${input.token}`) return true

  if (['x-api-key', 'api-key', 'x-goog-api-key'].some((header) => request.headers.get(header) === input.token))
    return true

  return url.hostname === 'generativelanguage.googleapis.com' && url.searchParams.get('key') === input.token
}
