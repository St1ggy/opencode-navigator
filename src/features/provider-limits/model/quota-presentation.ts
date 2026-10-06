import type { QuotaWindow } from '../../../entities/provider-limit'

function duration(minutes: number) {
  if (minutes % 10_080 === 0) return `${minutes / 10_080}w`

  if (minutes % 1440 === 0) return `${minutes / 1440}d`

  if (minutes % 60 === 0) return `${minutes / 60}h`

  return `${minutes}m`
}

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
  const account = window.scope === 'account' ? 'Account' : undefined
  const scope = window.kind === 'rate_limit' ? 'API' : account
  const period = window.durationMinutes ? duration(window.durationMinutes) : undefined
  const context = [scope, window.kind ? window.label : (period ?? window.label), window.kind ? period : undefined]
    .filter(Boolean)
    .join(' · ')

  return { value: measurement(window, remaining), ratio, reset: `${resetTime(window.resetsAt, now)} · ${context}` }
}
