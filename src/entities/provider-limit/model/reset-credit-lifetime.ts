import type { BankedResetCredit } from './types'

function remainingLabel(seconds: number) {
  if (seconds === 0) return 'Expired'

  if (seconds < 60) return 'Expires in less than a minute'

  for (const [unit, duration] of [
    ['day', 86_400],
    ['hour', 3600],
    ['minute', 60],
  ] as const) {
    if (seconds < duration) continue

    const count = Math.ceil(seconds / duration)

    return `Expires in ${count} ${unit}${count === 1 ? '' : 's'}`
  }

  return 'Expiry not supplied by the provider'
}

export function resetCreditLifetime(credit: Pick<BankedResetCredit, 'grantedAt' | 'expiresAt'>, now: number) {
  const expiry = credit.expiresAt

  if (expiry === undefined)
    return { label: 'Expiry not supplied by the provider', remaining: undefined, expired: false }

  if (!Number.isFinite(expiry) || expiry <= 0 || !Number.isFinite(new Date(expiry * 1000).getTime()))
    return { label: 'Expiry date is invalid', remaining: undefined, expired: false }

  const seconds = Math.max(0, expiry - now / 1000)
  const lifetime = expiry - credit.grantedAt
  const remaining =
    Number.isFinite(credit.grantedAt) && credit.grantedAt >= 0 && lifetime > 0
      ? Math.max(0, Math.min(1, seconds / lifetime))
      : undefined

  return { label: remainingLabel(seconds), remaining, expired: seconds === 0 }
}
