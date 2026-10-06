import type { QuotaWindow } from '../../../entities/provider-limit'

type CodexWindow = { usedPercent: number; windowDurationMins: number | null; resetsAt: number | null }
export type CodexLimit = {
  limitId: string | null
  limitName: string | null
  normalModelSlug?: string | null
  primary: CodexWindow | null
  secondary: CodexWindow | null
}

export function codexQuotaWindows(
  usage: { rateLimits: CodexLimit; rateLimitsByLimitId: Record<string, CodexLimit> | null },
  modelID: string,
): QuotaWindow[] {
  const buckets = new Map<string, CodexLimit>()
  const legacy = usage.rateLimits

  // The single-bucket field is the protocol's backward-compatible ordinary usage view.
  if (legacy.limitId === 'codex' || (!legacy.limitId && !legacy.normalModelSlug)) buckets.set('codex', legacy)

  const entries = Object.entries(usage.rateLimitsByLimitId ?? {})

  for (const [key, limit] of entries) buckets.set(limit.limitId ?? key, limit)

  if (legacy.limitId && !buckets.has(legacy.limitId)) buckets.set(legacy.limitId, legacy)

  return [...buckets].flatMap(([id, limit]) => {
    const account = id === 'codex'

    if (!account && limit.normalModelSlug !== modelID) return []

    return (['primary', 'secondary'] as const).flatMap((name) => {
      const value = limit[name]

      if (!value) return []

      return [
        {
          id: `${id}.${name}`,
          label: account ? `Codex account · ${name}` : `${limit.limitName ?? id} · ${name}`,
          limitID: id,
          ...(account ? { scope: 'account' as const } : { modelID }),
          unit: '%',
          used: value.usedPercent,
          ...(value.windowDurationMins !== null && { durationMinutes: value.windowDurationMins }),
          ...(value.resetsAt !== null && { resetsAt: value.resetsAt }),
        },
      ]
    })
  })
}
