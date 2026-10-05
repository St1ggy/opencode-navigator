import { milliseconds, number, object } from './native-values'

import type { QuotaWindow } from '../../../entities/provider-limit'

export function miniMaxWindows(body: Record<string, unknown>, modelID: string, apiModelID: string): QuotaWindow[] {
  const responseStatus = number(object(body.base_resp).status_code)

  if (responseStatus !== undefined && responseStatus !== 0) return []

  return (Array.isArray(body.model_remains) ? body.model_remains : []).flatMap((raw) => {
    const row = object(raw)

    if (row.model_name !== apiModelID) return []

    return ['interval', 'weekly'].flatMap((period) => {
      const total = number(row[`current_${period}_total_count`])
      const remainingPercent = number(row[`current_${period}_remaining_percent`])
      const status = number(row[`current_${period}_status`])

      if (total === undefined || total <= 0 || status === 3) return []

      const reset = milliseconds(row[period === 'weekly' ? 'weekly_end_time' : 'end_time'])

      return [
        {
          id: `minimax-${period}`,
          label: period === 'weekly' ? 'Weekly Token Plan' : 'Token Plan window',
          modelID,
          kind: remainingPercent === undefined ? ('configured_limit' as const) : ('subscription' as const),
          unit: remainingPercent === undefined ? 'usage units' : '%',
          ...(remainingPercent === undefined
            ? { total }
            : { used: 100 - remainingPercent, remaining: remainingPercent }),
          ...(reset !== undefined && { resetsAt: reset }),
        },
      ]
    })
  })
}

export function nanoWindows(body: Record<string, unknown>, modelID: string): QuotaWindow[] {
  if (body.active !== true) return []

  const limits = object(body.limits)

  return ['dailyInputTokens', 'weeklyInputTokens'].flatMap((period) => {
    const row = object(body[period])
    const total = number(limits[period])
    const used = number(row.used)
    const remaining = number(row.remaining)

    if (row.degraded === true || total === undefined || (used === undefined && remaining === undefined)) return []

    const resetsAt = milliseconds(row.resetAt)

    return [
      {
        id: `nanogpt-${period}`,
        label: period === 'dailyInputTokens' ? 'Daily subscription input tokens' : 'Weekly subscription input tokens',
        modelID,
        kind: 'subscription' as const,
        unit: 'tokens',
        total,
        ...(used !== undefined && { used }),
        ...(remaining !== undefined && { remaining }),
        ...(resetsAt !== undefined && { resetsAt }),
      },
    ]
  })
}

export function anthropicConfiguredWindows(
  body: Record<string, unknown>,
  modelID: string,
  apiModelID: string,
): QuotaWindow[] {
  return (Array.isArray(body.data) ? body.data : []).flatMap((raw) => {
    const row = object(raw)

    if (object(row.group).type !== 'model_group' || !Array.isArray(row.models) || !row.models.includes(apiModelID))
      return []

    return (Array.isArray(row.limits) ? row.limits : []).flatMap((rawLimit) => {
      const limit = object(rawLimit)
      const value = number(limit.value)
      const type = typeof limit.type === 'string' ? limit.type : ''
      const match = /^(requests|input_tokens|output_tokens|tokens)_per_(minute|day)$/.exec(type)

      if (value === undefined || !match) return []

      return [
        {
          id: `anthropic-${row.id}-${type}`,
          label: type.replaceAll('_', ' '),
          modelID,
          limitID: typeof row.id === 'string' ? row.id : undefined,
          kind: 'configured_limit' as const,
          unit: match[1].includes('tokens') ? 'tokens' : 'requests',
          durationMinutes: match[2] === 'day' ? 1440 : 1,
          total: value,
        },
      ]
    })
  })
}
