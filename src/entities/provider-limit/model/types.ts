export type QuotaAvailability =
  | 'ready'
  | 'unsupported'
  | 'unauthenticated'
  | 'stale'
  | 'rate_limited'
  | 'waiting'
  | 'setup_required'
  | 'permission_required'
  | 'unavailable'

export type SelectedModel = {
  providerID: string
  modelID: string
  sessionID: string
  variant?: string
  accountID?: string
  accountSource?: 'host' | 'binding'
  hostConnection?: HostProviderConnection
}

export type HostProviderConnection = {
  status: 'ready' | 'loading' | 'unavailable' | 'unsupported'
  id?: string
  accountID?: string
  method?: 'api' | 'oauth'
  providerID?: string
}

export type ProviderAccountSource = {
  current(model: SelectedModel): SelectedModel
  refresh(model: SelectedModel): Promise<void>
  validate(model: SelectedModel, signal: AbortSignal): Promise<boolean>
  dispose(): void
}

export type QuotaWindow = {
  id: string
  label: string
  modelID?: string
  scope?: 'account' | 'model'
  limitID?: string
  unit: string
  used?: number
  remaining?: number
  kind?: 'subscription' | 'rate_limit' | 'configured_limit'
  total?: number
  durationMinutes?: number
  resetsAt?: number
}

export type QuotaBalance = {
  id: string
  label: string
  amount?: string
  unit?: string
  unlimited?: boolean
  scope: 'account' | 'key'
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
  balances?: readonly QuotaBalance[]
  connectionID?: string
  message?: string
  ordinaryUsageAllowed?: boolean
  bankedResets?: BankedResets
}

export type ProviderQuotaAdapter = {
  id: string
  name: string
  supports(model: SelectedModel): boolean
  discoverAccount?(signal: AbortSignal): Promise<string>
  validateHost?(model: SelectedModel, signal: AbortSignal): Promise<boolean>
  read(model: SelectedModel, signal: AbortSignal, force?: boolean): Promise<ProviderQuotaSnapshot>
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
      (window.scope !== undefined && window.scope !== 'account' && window.scope !== 'model') ||
      (window.scope === 'account'
        ? !snapshot.accountId || window.modelID !== undefined
        : window.modelID !== snapshot.model.modelID) ||
      !window.unit ||
      (window.used !== undefined && !Number.isFinite(window.used)) ||
      (window.remaining !== undefined && !Number.isFinite(window.remaining)) ||
      (window.used === undefined && window.remaining === undefined && window.total === undefined) ||
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
  const balances = snapshot.balances?.map((balance) => {
    if (
      !balance.id ||
      !balance.label ||
      (balance.scope !== 'account' && balance.scope !== 'key') ||
      (balance.amount === undefined && !balance.unlimited) ||
      (balance.amount !== undefined &&
        (typeof balance.amount !== 'string' ||
          !/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(balance.amount) ||
          !Number.isFinite(Number(balance.amount)))) ||
      (balance.unit !== undefined && (typeof balance.unit !== 'string' || !balance.unit))
    )
      throw new Error('Invalid provider balance')

    return { ...balance }
  })

  if (bankedResets && (!Number.isSafeInteger(bankedResets.availableCount) || bankedResets.availableCount < 0)) {
    throw new Error('Invalid banked reset count')
  }

  return {
    ...snapshot,
    windows,
    ...(balances && { balances }),
    ...(bankedResets && {
      bankedResets: {
        availableCount: bankedResets.availableCount,
        ...(bankedResets.credits && { credits: [...bankedResets.credits] }),
      },
    }),
  }
}
