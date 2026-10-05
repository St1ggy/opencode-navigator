import { readAnthropicQuota } from './anthropic-quotas'
import {
  aiHubMixBalances,
  balanceSnapshot,
  deepSeekBalances,
  miniMaxBalances,
  moonshotBalances,
  nanoBalances,
  novitaBalances,
  poeBalances,
  siliconFlowBalances,
} from './balance-parsers'
import { matchingOrigin, nativeBaseURL } from './native-context'
import { readProviderJson } from './native-http'
import { balance, number, object } from './native-values'
import { miniMaxWindows, nanoWindows } from './subscription-parsers'

import type { NativeQuotaRequest } from './native-context'
import type { ProviderQuotaSnapshot } from '../../../entities/provider-limit'

const origins: Record<string, string[]> = {
  deepseek: ['https://api.deepseek.com'],
  moonshotai: ['https://api.moonshot.ai'],
  'moonshotai-cn': ['https://api.moonshot.cn'],
  siliconflow: ['https://api.siliconflow.com'],
  'siliconflow-cn': ['https://api.siliconflow.cn'],
  'novita-ai': ['https://api.novita.ai'],
  poe: ['https://api.poe.com'],
  aihubmix: ['https://aihubmix.com', 'https://api.aihubmix.com'],
  minimax: ['https://api.minimax.io', 'https://www.minimax.io'],
  'minimax-cn': ['https://api.minimaxi.com', 'https://www.minimaxi.com'],
  'nano-gpt': ['https://nano-gpt.com', 'https://api.nano-gpt.com'],
  anthropic: ['https://api.anthropic.com'],
}

export async function readNativeRest(input: NativeQuotaRequest): Promise<ProviderQuotaSnapshot | undefined> {
  const { canonical, token, signal, fetcher, model, provider, apiModelID } = input
  const allowed = origins[canonical]

  if (!allowed || !matchingOrigin(provider, allowed)) return

  const read = (url: string, options?: Parameters<typeof readProviderJson>[4]) =>
    readProviderJson(fetcher, url, token, signal, options)
  const make = (values: Parameters<typeof balanceSnapshot>[2], accountId?: string) =>
    balanceSnapshot(model, provider.name, values, Date.now(), accountId)

  switch (canonical) {
    case 'deepseek': {
      return make(deepSeekBalances(await read('https://api.deepseek.com/user/balance')))
    }

    case 'moonshotai': {
      return make(moonshotBalances(await read('https://api.moonshot.ai/v1/users/me/balance'), 'USD'))
    }

    case 'moonshotai-cn': {
      return make(moonshotBalances(await read('https://api.moonshot.cn/v1/users/me/balance'), 'CNY'))
    }

    // Both regions share the same documented response schema.
    case 'siliconflow':
    // falls through

    case 'siliconflow-cn': {
      const body = await read(`${allowed[0]}/v1/user/info`)
      const id = object(body.data).id

      return make(siliconFlowBalances(body), typeof id === 'string' ? id : undefined)
    }

    case 'novita-ai': {
      return make(novitaBalances(await read('https://api.novita.ai/openapi/v1/billing/balance/detail')))
    }

    case 'poe': {
      return make(poeBalances(await read('https://api.poe.com/usage/current_balance')))
    }

    case 'aihubmix': {
      return make(aiHubMixBalances(await read('https://aihubmix.com/api/user/self')))
    }

    // The selected region determines the API origin, not the response schema.
    case 'minimax':
    // falls through

    case 'minimax-cn': {
      const base = allowed[0]

      if (input.credential.type === 'key' && token.startsWith('sk-api-'))
        return make(miniMaxBalances(await read(`${base}/account/query_balance`)))

      const body = await read(`${base}/v1/token_plan/remains`)
      const windows = miniMaxWindows(body, model.modelID, apiModelID)

      return {
        ...make([]),
        windows,
        availability: windows.length > 0 ? 'ready' : 'unavailable',
        message:
          windows.length > 0
            ? undefined
            : 'No finite, model-associated Token Plan allowance was reported. Missing or ambiguous counts are not treated as remaining quota.',
      }
    }

    case 'nano-gpt': {
      const configured = nativeBaseURL(provider)
      const base = configured ? new URL(configured).origin : allowed[0]
      const balances = nanoBalances(
        await read(`${base}/api/check-balance`, { method: 'POST', apiKeyHeader: 'x-api-key' }),
      )
      let subscription

      try {
        subscription = await Promise.all([
          read(`${base}/api/subscription/v1/usage`),
          read(`${base}/api/subscription/v1/models`),
        ])
      } catch (error) {
        if (signal.aborted || balances.length === 0) throw error

        return { ...make(balances), message: 'Account balance is available; subscription counters could not be read.' }
      }

      const [usage, models] = subscription
      const covered = Array.isArray(models.data) && models.data.some((entry) => object(entry).id === apiModelID)
      const windows = covered ? nanoWindows(usage, model.modelID) : []

      return {
        ...make(balances),
        windows,
        ...(windows.length > 0 && { availability: 'ready' as const }),
        ...(windows.length === 0 && {
          message:
            'Subscription windows are shown only for provider-listed subscription models with non-degraded counters.',
        }),
      }
    }

    case 'anthropic': {
      return readAnthropicQuota(input)
    }
  }

  return undefined
}

export function openRouterFreeWindow(body: Record<string, unknown>, modelID: string, apiModelID: string) {
  if (!apiModelID.endsWith(':free')) return []

  const data = object(object(body.data).free_model_daily_requests)
  const total = number(data.limit)
  const remaining = number(data.remaining)
  const used = number(data.used)

  return total !== undefined && (used !== undefined || remaining !== undefined)
    ? [
        {
          id: 'openrouter-free-daily',
          label: 'Free-model daily requests',
          modelID,
          unit: 'requests',
          durationMinutes: 1440,
          kind: 'rate_limit' as const,
          total,
          ...(used !== undefined && { used }),
          ...(remaining !== undefined && { remaining }),
        },
      ]
    : []
}

export function managementCredits(body: Record<string, unknown>) {
  const data = object(body.data)
  const total = number(data.total_credits)
  const used = number(data.total_usage)

  return total !== undefined && used !== undefined
    ? balance('account-credits', 'Remaining account credits', total - used, 'USD')
    : []
}
