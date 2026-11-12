import { quotaPace, quotaPaceLabels, quotaPeriod } from './quota-period'

import type { QuotaWindow } from '../../../entities/provider-limit/model'

function measurement(window: QuotaWindow, remaining: number | undefined) {
  if (remaining !== undefined) return `${remaining}${window.unit === '%' ? '' : ' '}${window.unit} left`

  if (window.used !== undefined) return `${window.used} ${window.unit} used`

  return `${window.total} ${window.unit} capacity`
}

function resetTime(seconds: number | undefined, now: number) {
  if (seconds === undefined) return 'Reset time unknown'

  if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(new Date(seconds * 1000).getTime()))
    return 'Reset date invalid'

  const date = new Date(seconds * 1000)
  const clock = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  if (date.toDateString() === new Date(now).toDateString()) return `Resets ${clock}`

  return `Resets ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${clock}`
}

export function quotaPresentation(window: QuotaWindow, now = Date.now()) {
  const total = window.unit === '%' ? 100 : window.total
  const remaining =
    window.remaining ?? (total !== undefined && window.used !== undefined ? total - window.used : undefined)
  const ratio =
    remaining !== undefined && total !== undefined && total > 0
      ? Math.max(0, Math.min(1, remaining / total))
      : undefined

  const period = quotaPeriod(window, now)
  const pace = quotaPace(ratio, period)
  const reset = resetTime(window.resetsAt, now)
  const resetSummary =
    period.seconds !== undefined && period.seconds > 0 ? `${period.countdown} · ${reset}` : period.countdown

  return {
    value: measurement(window, remaining),
    compactValue:
      window.unit === '%' && ratio !== undefined ? `${Math.round(ratio * 100)}%` : measurement(window, remaining),
    ratio,
    reset,
    resetSummary,
    canToggleReset: reset.startsWith('Resets '),
    relativeReset: period.ratio === undefined ? `${period.countdown} · ${period.detail}` : period.countdown,
    absoluteReset: period.ratio === undefined ? `${reset} · ${period.detail}` : reset,
    period,
    pace,
    paceLabel: quotaPaceLabels[pace],
  }
}
