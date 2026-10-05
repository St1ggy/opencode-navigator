import { normalizeProviderQuota } from '../../../entities/provider-limit'

import type { CodexAppServerClient } from './codex-app-server'
import type {
  ProviderQuotaAdapter,
  ProviderQuotaSnapshot,
  QuotaWindow,
  SelectedModel,
} from '../../../entities/provider-limit'

type CodexWindow = { usedPercent: number; windowDurationMins: number | null; resetsAt: number | null }
type CodexLimit = {
  limitId: string | null
  limitName: string | null
  normalModelSlug: string | null
  primary: CodexWindow | null
  secondary: CodexWindow | null
}
type Credit = {
  id: string
  resetType: string
  status: 'available' | 'redeeming' | 'redeemed' | 'unknown'
  grantedAt: number
  expiresAt: number | null
  title: string | null
  description: string | null
}
type RateLimits = {
  accountId: string | null
  ordinaryUsageAllowed: boolean | null
  rateLimits: CodexLimit
  rateLimitsByLimitId: Record<string, CodexLimit> | null
  rateLimitResetCredits: { availableCount: number; credits: Credit[] | null } | null
}

function windows(limit: CodexLimit, model: SelectedModel): QuotaWindow[] {
  return (['primary', 'secondary'] as const).flatMap((name) => {
    const value = limit[name]

    return value
      ? [
          {
            id: `${limit.limitId ?? model.modelID}.${name}`,
            label: limit.limitName ? `${limit.limitName} · ${name}` : name,
            limitID: limit.limitId ?? undefined,
            modelID: model.modelID,
            unit: '%',
            used: value.usedPercent,
            ...(value.windowDurationMins !== null && { durationMinutes: value.windowDurationMins }),
            ...(value.resetsAt !== null && { resetsAt: value.resetsAt }),
          },
        ]
      : []
  })
}

export function createCodexQuotaAdapter(
  client: CodexAppServerClient,
  validateHost?: ProviderQuotaAdapter['validateHost'],
): ProviderQuotaAdapter {
  const adapter: ProviderQuotaAdapter = {
    id: 'codex',
    name: 'Codex CLI',
    supports: (model) =>
      (model.providerID === 'openai' || model.hostConnection?.providerID === 'openai') &&
      model.hostConnection?.method !== 'api' &&
      Boolean(model.accountID) &&
      (!model.hostConnection || model.hostConnection.status === 'ready'),
    ...(validateHost && { validateHost }),
    async discoverAccount(signal) {
      const account = await client.request<{ account: { type: string } | null }>(
        'account/read',
        { refreshToken: false },
        signal,
      )

      if (account.account?.type !== 'chatgpt') throw new Error('Sign in to Codex CLI with ChatGPT')

      const usage = await client.request<RateLimits>(
        'account/rateLimits/read',
        { supportsLunaReserve: false, excludeResetCreditDetails: true },
        signal,
      )

      if (!usage.accountId) throw new Error('Codex account identity is unavailable')

      return usage.accountId
    },
    async read(model, signal): Promise<ProviderQuotaSnapshot> {
      const base = {
        model,
        providerId: 'codex',
        providerName: 'Codex CLI',
        fetchedAt: Date.now(),
        windows: [] as QuotaWindow[],
      }

      if (validateHost && !(await validateHost(model, signal))) return { ...base, availability: 'unauthenticated' }

      const account = await client.request<{ account: { type: string } | null }>(
        'account/read',
        { refreshToken: false },
        signal,
      )

      if (account.account?.type !== 'chatgpt') return { ...base, availability: 'unauthenticated' }

      const usage = await client.request<RateLimits>(
        'account/rateLimits/read',
        { supportsLunaReserve: false, excludeResetCreditDetails: false },
        signal,
      )

      if (!usage.accountId || usage.accountId !== model.accountID) return { ...base, availability: 'unauthenticated' }

      const candidates = Object.values(usage.rateLimitsByLimitId ?? {})
      const matched = (candidates.length > 0 ? candidates : [usage.rateLimits]).filter(
        (limit) => limit.normalModelSlug === model.modelID,
      )

      if (matched.length === 0) return { ...base, accountId: usage.accountId, availability: 'unsupported' }

      const creditSummary = usage.rateLimitResetCredits

      return normalizeProviderQuota({
        ...base,
        accountId: usage.accountId,
        availability: 'ready',
        ordinaryUsageAllowed: usage.ordinaryUsageAllowed ?? undefined,
        windows: matched.flatMap((limit) => windows(limit, model)),
        ...(creditSummary && {
          bankedResets: {
            availableCount: creditSummary.availableCount,
            ...(creditSummary.credits && {
              credits: creditSummary.credits.map((credit) => ({
                id: credit.id,
                type: credit.resetType,
                status: credit.status,
                grantedAt: credit.grantedAt,
                ...(credit.expiresAt !== null && { expiresAt: credit.expiresAt }),
                ...(credit.title && { title: credit.title }),
                ...(credit.description && { description: credit.description }),
              })),
            }),
          },
        }),
      })
    },
    async prepareResetCreditConsumption(model, creditID, signal) {
      const snapshot = await adapter.read(model, signal)

      if (
        snapshot.availability === 'unauthenticated' ||
        !snapshot.accountId ||
        snapshot.accountId !== model.accountID
      ) {
        throw new Error('Codex account is unavailable or changed')
      }

      if (
        snapshot.availability !== 'ready' ||
        snapshot.ordinaryUsageAllowed !== false ||
        snapshot.windows.length === 0
      ) {
        throw new Error('Selected model has no eligible rate-limit window')
      }

      const credits = snapshot.bankedResets

      if (!credits?.availableCount) throw new Error('Codex reset credit is unavailable')

      if (creditID) {
        const credit = credits.credits?.find((item) => item.id === creditID)

        if (
          !credit ||
          credit.type !== 'codexRateLimits' ||
          credit.status !== 'available' ||
          (credit.expiresAt !== undefined && credit.expiresAt <= Math.floor(Date.now() / 1000))
        ) {
          throw new Error('Selected banked reset is no longer available')
        }
      }

      return snapshot
    },
    async consumeResetCredit(model, attempt, signal) {
      if (!model.accountID || model.accountID !== attempt.accountID) throw new Error('Codex account changed')

      if (attempt.uncertain) {
        const latest = await adapter.read(model, signal)

        if (latest.accountId !== attempt.accountID) throw new Error('Codex account changed')
      } else await adapter.prepareResetCreditConsumption!(model, attempt.creditID, signal)

      signal.throwIfAborted()

      if (validateHost && !(await validateHost(model, signal)))
        throw new Error('OpenCode account or connection changed')

      signal.throwIfAborted()

      const result = await client.request<{ outcome: 'reset' | 'nothingToReset' | 'noCredit' | 'alreadyRedeemed' }>(
        'account/rateLimitResetCredit/consume',
        { idempotencyKey: attempt.idempotencyKey, ...(attempt.creditID && { creditId: attempt.creditID }) },
        signal,
      )

      return result.outcome
    },
    dispose: client.dispose,
  }

  return adapter
}
