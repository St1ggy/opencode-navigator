import { balanceSnapshot } from './balance-parsers'
import { readProviderJson } from './native-http'
import { anthropicConfiguredWindows } from './subscription-parsers'

import type { NativeQuotaRequest } from './native-context'
import type { QuotaWindow } from '../../../entities/provider-limit'

export async function readAnthropicQuota(input: NativeQuotaRequest) {
  const options = {
    headers: { 'anthropic-version': '2023-06-01' },
    ...(input.credential.type === 'key' && { apiKeyHeader: 'x-api-key' }),
  }
  const windows: QuotaWindow[] = []
  let page: string | undefined

  for (let index = 0; index < 10; index++) {
    const url = new URL('https://api.anthropic.com/v1/organizations/rate_limits')

    url.searchParams.set('model', input.apiModelID)

    if (page) url.searchParams.set('page', page)

    const body = await readProviderJson(input.fetcher, url.href, input.token, input.signal, options)

    windows.push(...anthropicConfiguredWindows(body, input.model.modelID, input.apiModelID))
    page = typeof body.next_page === 'string' && body.next_page ? body.next_page : undefined

    if (!page) break
  }

  return {
    ...balanceSnapshot(input.model, input.provider.name, []),
    windows,
    availability: windows.length > 0 ? ('ready' as const) : ('unsupported' as const),
    message:
      windows.length > 0
        ? 'Configured rate limits; remaining capacity is not reported by this API.'
        : 'No explicit rate-limit group was reported for the selected model.',
  }
}
