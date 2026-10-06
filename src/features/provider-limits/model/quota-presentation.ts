import type { QuotaWindow } from '../../../entities/provider-limit'

function measurement(window: QuotaWindow, remaining: number | undefined) {
  if (remaining !== undefined) return `${remaining}${window.unit === '%' ? '' : ' '}${window.unit} left`

  if (window.used !== undefined) return `${window.used} ${window.unit} used`

  return `${window.total} ${window.unit} capacity`
}

function resetTime(seconds: number | undefined, now: number) {
  if (seconds === undefined) return 'Reset time unknown'

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

  return { value: measurement(window, remaining), ratio, reset: resetTime(window.resetsAt, now) }
}
