import type { QuotaBalance } from '../../../entities/provider-limit/model'

function creditAmount(amount: string) {
  const match = /^([+-]?)(\d{1,1000})(?:\.(\d{1,1000}))?$/u.exec(amount.trim())

  if (!match) return amount

  const fraction = (match[3] ?? '').padEnd(3, '0')
  const cents = BigInt(match[2]) * 100n + BigInt(fraction.slice(0, 2)) + (fraction[2] >= '5' ? 1n : 0n)

  return `${match[1] === '-' && cents !== 0n ? '-' : ''}${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}

export function quotaBalanceValue(balance: QuotaBalance) {
  if (balance.unlimited) return 'Unlimited'

  if (balance.amount === undefined) return 'Unavailable'

  const unit =
    balance.unit === 'credits' && balance.label === 'Credits'
      ? ''
      : ` ${balance.unit ?? '(provider unit not specified)'}`

  return `${balance.unit === 'credits' ? creditAmount(balance.amount) : balance.amount}${unit}`
}
