import { matchingOrigin } from './native-context'
import { readProviderJson } from './native-http'
import { number, object } from './native-values'

import type { NativeQuotaRequest } from './native-context'
import type { ProviderQuotaSnapshot, QuotaWindow } from '../../../entities/provider-limit'

export async function readFireworksQuota(input: NativeQuotaRequest): Promise<ProviderQuotaSnapshot | undefined> {
  if (!matchingOrigin(input.provider, ['https://api.fireworks.ai'])) return

  const read = (url: string) => readProviderJson(input.fetcher, url, input.token, input.signal)
  const accounts = await read('https://api.fireworks.ai/v1/accounts?pageSize=200&readMask=name,displayName')
  const candidates = Array.isArray(accounts.accounts) ? accounts.accounts.map((entry) => object(entry)) : []
  const requested = input.credential.metadata?.accountID
  const selected =
    typeof requested === 'string'
      ? candidates.filter((entry) => entry.name === requested || entry.name === `accounts/${requested}`)
      : candidates
  const base = {
    model: input.model,
    providerId: input.model.providerID,
    providerName: input.provider.name,
    fetchedAt: Date.now(),
    windows: [] as QuotaWindow[],
  }

  if (selected.length !== 1 || (requested === undefined && (accounts.nextPageToken || number(accounts.totalSize)! > 1)))
    return {
      ...base,
      availability: 'unavailable',
      message: 'Fireworks billing account is ambiguous; it is never inferred from a model owner.',
    }

  const name = typeof selected[0].name === 'string' ? selected[0].name : ''

  if (!/^accounts\/[\w-]+$/.test(name))
    return { ...base, availability: 'unavailable', message: 'Fireworks did not report an account resource name.' }

  let page: string | undefined

  for (let index = 0; index < 10; index++) {
    const url = new URL(`https://api.fireworks.ai/v1/${name}/quotas`)

    url.searchParams.set('pageSize', '200')

    if (page) url.searchParams.set('pageToken', page)

    const body = await read(url.href)

    const quotas = Array.isArray(body.quotas) ? body.quotas : []

    for (const raw of quotas) {
      const quota = object(raw)
      const total = number(quota.value)
      const used = number(quota.usage)

      if (quota.name === `${name}/quotas/monthly-spend-usd` && total !== undefined)
        base.windows.push({
          id: 'fireworks-monthly-spend',
          label: 'Account monthly spend cap',
          modelID: input.model.modelID,
          limitID: quota.name,
          kind: 'configured_limit',
          unit: 'USD',
          total,
          ...(used !== undefined && { used, remaining: total - used }),
        })
    }
    page = typeof body.nextPageToken === 'string' && body.nextPageToken ? body.nextPageToken : undefined

    if (!page) break
  }

  return {
    ...base,
    accountId: name,
    availability: base.windows.length > 0 ? 'ready' : 'unavailable',
    message: 'Account-wide spend quota. GPU and unrelated deployment quotas are excluded.',
  }
}
