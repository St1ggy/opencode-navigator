import type { QuotaWindow } from '../../../entities/provider-limit/model'

export type QuotaPace = 'normal' | 'yellow' | 'orange' | 'red'

function duration(seconds: number) {
  if (seconds < 60) return '<1m'

  const minutes = Math.ceil(seconds / 60)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)

  if (days) return `${days}d ${hours}h`

  if (hours) return `${hours}h ${minutes % 60}m`

  return `${minutes}m`
}

export function quotaPeriod(window: Pick<QuotaWindow, 'resetsAt' | 'durationMinutes'>, now: number) {
  const reset = window.resetsAt
  const missing = {
    ratio: undefined,
    seconds: undefined as number | undefined,
    active: false,
    countdown: 'Reset time unknown',
    detail: 'Period progress unknown',
  }

  if (reset === undefined) return missing

  if (
    !Number.isFinite(now) ||
    !Number.isFinite(reset) ||
    reset <= 0 ||
    !Number.isFinite(new Date(reset * 1000).getTime())
  )
    return { ...missing, countdown: 'Reset date invalid' }

  const seconds = reset - now / 1000
  const countdown = seconds <= 0 ? 'Reset due; refresh to verify' : `Reset in ${duration(seconds)}`
  const dated = { ...missing, seconds, countdown }
  const length = window.durationMinutes

  if (length === undefined) return { ...dated, detail: 'Period duration unknown' }

  if (!Number.isFinite(length * 60) || length <= 0) return { ...dated, detail: 'Period duration invalid' }

  if (seconds > length * 60) return { ...dated, detail: 'Window has not started; progress unknown' }

  const ratio = Math.max(0, Math.min(1, seconds / (length * 60)))

  return { ...dated, ratio, active: seconds > 0, detail: `${Math.round(ratio * 100)}%` }
}

export function quotaPace(quota: number | undefined, period: ReturnType<typeof quotaPeriod>): QuotaPace {
  if (quota === undefined || !Number.isFinite(quota) || !period.active || period.ratio === undefined) return 'normal'

  const deficit = Math.round((period.ratio - quota) * 100_000) / 1000

  if (deficit >= 30) return 'red'

  if (deficit >= 15) return 'orange'

  return deficit > 0 ? 'yellow' : 'normal'
}

export const quotaPaceLabels: Record<QuotaPace, string> = {
  normal: '',
  yellow: 'Above pace',
  orange: 'High usage pace',
  red: 'Critical usage pace',
}
