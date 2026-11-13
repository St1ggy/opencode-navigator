import type { QuotaBalance } from '../../../entities/provider-limit/model'

export function quotaBalanceValue(balance: QuotaBalance) {
  if (balance.unlimited) return 'Unlimited'

  const unit =
    balance.unit === 'credits' && balance.label === 'Credits'
      ? ''
      : ` ${balance.unit ?? '(provider unit not specified)'}`

  return `${balance.amount}${unit}`
}
