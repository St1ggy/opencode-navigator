export type QuotaAvailability = 'ready' | 'unsupported' | 'unauthenticated' | 'stale' | 'rate_limited'

export type SelectedModel = {
  providerID: string
  modelID: string
  sessionID: string
  variant?: string
  accountID?: string
}

export type QuotaWindow = {
  id: string
  label: string
  modelID: string
  limitID?: string
  unit: string
  used: number
  total?: number
  durationMinutes?: number
  resetsAt?: number
}

export type BankedResetCredit = {
  id: string
  type: string
  status: 'available' | 'redeeming' | 'redeemed' | 'unknown'
  grantedAt: number
  expiresAt?: number
  title?: string
  description?: string
}

export type BankedResets = {
  availableCount: number
  credits?: readonly BankedResetCredit[]
}

export type ProviderQuotaSnapshot = {
  model: SelectedModel
  providerId: string
  providerName: string
  accountId?: string
  accountLabel?: string
  fetchedAt: number
  availability: QuotaAvailability
  windows: readonly QuotaWindow[]
  ordinaryUsageAllowed?: boolean
  bankedResets?: BankedResets
}

export type ProviderQuotaAdapter = {
  id: string
  name: string
  supports(model: SelectedModel): boolean
  discoverAccount?(signal: AbortSignal): Promise<string>
  read(model: SelectedModel, signal: AbortSignal): Promise<ProviderQuotaSnapshot>
  prepareResetCreditConsumption?(
    model: SelectedModel,
    creditID: string | undefined,
    signal: AbortSignal,
  ): Promise<ProviderQuotaSnapshot>
  consumeResetCredit?(
    model: SelectedModel,
    attempt: { accountID: string; creditID?: string; idempotencyKey: string; uncertain?: boolean },
    signal: AbortSignal,
  ): Promise<'reset' | 'nothingToReset' | 'noCredit' | 'alreadyRedeemed'>
  dispose?(): void | Promise<void>
}

export function normalizeProviderQuota(snapshot: ProviderQuotaSnapshot): ProviderQuotaSnapshot {
  if (
    !snapshot.providerId ||
    !snapshot.providerName ||
    !snapshot.model.providerID ||
    !snapshot.model.modelID ||
    !snapshot.model.sessionID ||
    !Number.isFinite(snapshot.fetchedAt)
  ) {
    throw new Error('Invalid provider quota identity')
  }

  const windows = snapshot.windows.map((window) => {
    if (
      !window.id ||
      !window.label ||
      window.modelID !== snapshot.model.modelID ||
      !window.unit ||
      !Number.isFinite(window.used) ||
      (window.total !== undefined && (!Number.isFinite(window.total) || window.total < 0)) ||
      (window.durationMinutes !== undefined &&
        (!Number.isFinite(window.durationMinutes) || window.durationMinutes < 0)) ||
      (window.resetsAt !== undefined && !Number.isFinite(window.resetsAt))
    ) {
      throw new Error('Quota window does not match the selected model or contains invalid values')
    }

    return { ...window }
  })
  const bankedResets = snapshot.bankedResets

  if (bankedResets && (!Number.isSafeInteger(bankedResets.availableCount) || bankedResets.availableCount < 0)) {
    throw new Error('Invalid banked reset count')
  }

  return {
    ...snapshot,
    windows,
    ...(bankedResets && {
      bankedResets: {
        availableCount: bankedResets.availableCount,
        ...(bankedResets.credits && { credits: [...bankedResets.credits] }),
      },
    }),
  }
}
