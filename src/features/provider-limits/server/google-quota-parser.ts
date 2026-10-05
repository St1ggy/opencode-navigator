import { number, object } from './native-values'

import type { QuotaWindow } from '../../../entities/provider-limit'

export function googleQuotaFailureWindows(
  body: Record<string, unknown>,
  modelID: string,
  apiModelID: string,
): QuotaWindow[] {
  const details = object(body.error).details

  return (Array.isArray(details) ? details : []).flatMap((raw) => {
    const detail = object(raw)

    if (detail['@type'] !== 'type.googleapis.com/google.rpc.QuotaFailure') return []

    return (Array.isArray(detail.violations) ? detail.violations : []).flatMap((rawViolation) => {
      const violation = object(rawViolation)
      const dimensions = object(violation.quotaDimensions)
      const value = number(violation.quotaValue)
      const id = typeof violation.quotaId === 'string' ? violation.quotaId : ''
      const metric = typeof violation.quotaMetric === 'string' ? violation.quotaMetric : ''
      const selected = dimensions.model ?? dimensions.base_model

      if (selected !== apiModelID || value === undefined) return []

      const requestUnit = metric.includes('requests') ? 'requests' : undefined
      const unit = metric.includes('tokens') ? 'tokens' : requestUnit

      if (!unit) return []

      return [
        {
          id: `google-${id || metric}`,
          label: id || metric,
          modelID,
          limitID: id,
          kind: 'configured_limit' as const,
          unit,
          total: value,
        },
      ]
    })
  })
}
