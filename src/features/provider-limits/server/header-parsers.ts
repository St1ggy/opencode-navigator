import { number } from './native-values'

import type { QuotaWindow } from '../../../entities/provider-limit'

function reset(value: string | null, now: number): number | undefined {
  if (!value || value.length > 128) return

  if (value.includes('T')) {
    const time = Date.parse(value)

    return Number.isFinite(time) ? time / 1000 : undefined
  }

  // oxlint-disable-next-line sonarjs/super-linear-regex -- Reset headers are bounded to 128 characters above.
  const parts = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|[dhms])/g)]

  if (parts.length === 0 || parts.map((part) => part[0]).join('') !== value) return

  const units: Record<string, number> = { d: 86_400, h: 3600, m: 60, s: 1, ms: 0.001 }

  return now / 1000 + parts.reduce((seconds, part) => seconds + Number(part[1]) * units[part[2]], 0)
}

function counterWindow(
  modelID: string,
  headers: Headers,
  now: number,
  prefix: string,
  suffix: string,
  label: string,
  unit: string,
  durationMinutes?: number,
): QuotaWindow[] {
  const total = number(headers.get(`${prefix}limit-${suffix}`))
  const remaining = number(headers.get(`${prefix}remaining-${suffix}`))

  if (
    (total === undefined && remaining === undefined) ||
    (total !== undefined && total < 0) ||
    (remaining !== undefined && remaining < 0)
  )
    return []

  const resetsAt = reset(headers.get(`${prefix}reset-${suffix}`), now)

  return [
    {
      id: `${prefix}${suffix}`,
      label,
      modelID,
      unit,
      kind: 'rate_limit',
      ...(total !== undefined && { total }),
      ...(remaining !== undefined && { remaining }),
      ...(total !== undefined && remaining !== undefined && { used: total - remaining }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(resetsAt !== undefined && { resetsAt }),
    },
  ]
}

export function nativeHeaderWindows(
  providerID: string,
  modelID: string,
  headers: Headers,
  now = Date.now(),
): QuotaWindow[] {
  const windows: QuotaWindow[] = []
  const add = (prefix: string, suffix: string, label: string, unit: string, durationMinutes?: number) => {
    windows.push(...counterWindow(modelID, headers, now, prefix, suffix, label, unit, durationMinutes))
  }

  const genericFields = ['openai', 'groq', 'azure'].includes(providerID) ? ['requests', 'tokens', 'project-tokens'] : []
  const groqPeriods: Record<string, number> = { requests: 1440, tokens: 1, 'project-tokens': 1 }

  for (const field of genericFields) {
    add(
      'x-ratelimit-',
      field,
      field.replaceAll('-', ' '),
      field === 'requests' ? 'requests' : 'tokens',
      providerID === 'groq' ? groqPeriods[field] : undefined,
    )
  }
  const periodDurations: Record<string, number> = { minute: 1, hour: 60, day: 1440 }
  const periods = providerID === 'cerebras' ? ['minute', 'hour', 'day'] : []

  for (const period of periods) {
    for (const field of ['requests', 'req', 'tokens'])
      add(
        'x-ratelimit-',
        `${field}-${period}`,
        `${field === 'req' ? 'requests' : field} / ${period}`,
        field === 'tokens' ? 'tokens' : 'requests',
        periodDurations[period],
      )
  }
  const anthropicFields = providerID === 'anthropic' ? ['requests', 'tokens', 'input-tokens', 'output-tokens'] : []
  const priorityFields = providerID === 'anthropic' ? ['input-tokens', 'output-tokens'] : []

  for (const field of anthropicFields)
    add('anthropic-ratelimit-', field, field.replaceAll('-', ' '), field === 'requests' ? 'requests' : 'tokens', 1)
  for (const field of priorityFields)
    add('anthropic-priority-', field, `Priority ${field.replaceAll('-', ' ')}`, 'tokens', 1)

  if (['fireworks-ai', 'fireworks'].includes(providerID)) {
    for (const [field, label] of [
      ['prompt', 'Total prompt throughput'],
      ['cache-adjusted-prompt', 'Uncached prompt throughput'],
      ['generated', 'Output throughput'],
    ]) {
      const total = number(headers.get(`x-ratelimit-limit-tokens-${field}`))

      if (total !== undefined && total >= 0)
        windows.push({ id: `fireworks-${field}`, label, modelID, total, unit: 'tokens/s', kind: 'configured_limit' })
    }
  }

  return windows
}
