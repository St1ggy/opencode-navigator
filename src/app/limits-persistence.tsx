import { createLimitsRefresh } from './limits-refresh'

import type { LimitsRefreshOptions } from './limits-refresh'

export function LimitsPersistence(props: LimitsRefreshOptions) {
  createLimitsRefresh(props)

  return <box />
}
