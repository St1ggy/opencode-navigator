import type { QuotaBalance } from '../../../entities/provider-limit/model'
import type { CodexLimit } from './codex-quota-windows'

export function codexCreditBalance(usage: {
  rateLimits: CodexLimit
  rateLimitsByLimitId: Record<string, CodexLimit> | null
}): QuotaBalance[] {
  const ordinary = usage.rateLimitsByLimitId?.codex
  const legacy = usage.rateLimits
  const bucket =
    ordinary ?? (legacy.limitId === 'codex' || (!legacy.limitId && !legacy.normalModelSlug) ? legacy : undefined)
  const credit = bucket?.credits

  if (!credit || (bucket?.limitId && bucket.limitId !== 'codex')) return []

  const base = { id: 'codex.credits', label: 'Credits', scope: 'account' as const, unit: 'credits' }

  if (credit.unlimited) return [{ ...base, unlimited: true }]

  return typeof credit.balance === 'string' && credit.balance.trim() !== '' ? [{ ...base, amount: credit.balance }] : []
}
