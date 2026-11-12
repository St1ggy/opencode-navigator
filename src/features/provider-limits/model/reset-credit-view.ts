import { resetCreditLifetime } from '../../../entities/provider-limit/model'

import type { BankedResetCredit } from '../../../entities/provider-limit/model'

export function resetCreditView(credit: BankedResetCredit, now: number) {
  const expired = resetCreditLifetime(credit, now).expired
  const labels = { available: 'Available', redeeming: 'In progress', redeemed: 'Used', unknown: 'Status unknown' }
  const status =
    expired && (credit.status === 'available' || credit.status === 'unknown') ? 'Expired' : labels[credit.status]

  return {
    title: credit.title || `Credit ${credit.id}`,
    status,
    canReview: credit.status === 'available' && !expired && credit.type === 'codexRateLimits',
  }
}
