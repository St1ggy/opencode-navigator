import type { QuotaBalance } from '../../../entities/provider-limit'

export function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function number(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  return typeof value === 'string' && /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value) && Number.isFinite(Number(value))
    ? Number(value)
    : undefined
}

export function balance(
  id: string,
  label: string,
  value: unknown,
  unit?: string,
  scope: QuotaBalance['scope'] = 'account',
): QuotaBalance[] {
  if (number(value) === undefined) return []

  return [{ id, label, amount: String(value), ...(unit && { unit }), scope }]
}

export function scaledAmount(value: unknown, digits: number, multiplier = 1n): string | undefined {
  const numeric = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : ''
  const text = typeof value === 'string' ? value : numeric

  if (!/^-?\d+$/.test(text)) return

  const raw = BigInt(text) * multiplier
  const negative = raw < 0n
  const absolute = negative ? -raw : raw
  const divisor = 10n ** BigInt(digits)

  return `${negative ? '-' : ''}${absolute / divisor}.${String(absolute % divisor).padStart(digits, '0')}`
}

export function milliseconds(value: unknown): number | undefined {
  const time = number(value)

  return time !== undefined && time >= 100_000_000_000 ? time / 1000 : undefined
}
