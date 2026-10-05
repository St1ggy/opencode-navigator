import { balanceSnapshot, openRouterBudget } from './balance-parsers'
import { matchingOrigin } from './native-context'
import { readProviderJson } from './native-http'
import { object } from './native-values'
import { managementCredits, openRouterFreeWindow } from './rest-balances'

import type { NativeQuotaRequest } from './native-context'

export async function readOpenRouterQuota(input: NativeQuotaRequest) {
  if (!matchingOrigin(input.provider, ['https://openrouter.ai'])) return

  const body = await readProviderJson(input.fetcher, 'https://openrouter.ai/api/v1/key', input.token, input.signal)
  const data = object(body.data)
  const balances = openRouterBudget(body)

  if (data.is_management_key === true)
    balances.push(
      ...managementCredits(
        await readProviderJson(input.fetcher, 'https://openrouter.ai/api/v1/credits', input.token, input.signal),
      ),
    )

  const windows = openRouterFreeWindow(body, input.model.modelID, input.apiModelID)
  const id = typeof data.organization_id === 'string' ? data.organization_id : undefined

  return {
    ...balanceSnapshot(input.model, input.provider.name, balances, Date.now(), id),
    windows,
    ...(windows.length > 0 && { availability: 'ready' as const }),
    message:
      data.is_management_key === true
        ? undefined
        : 'Key budget, not account balance. Reading account credits requires a management key.',
  }
}
