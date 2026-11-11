import { currentLocation } from '../../../shared/lib/location'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function searchContext(api: TuiPluginApi) {
  const route = api.route.current
  const sessionID =
    route.name === 'session' && 'params' in route && typeof route.params?.sessionID === 'string'
      ? route.params.sessionID
      : undefined
  const location = currentLocation(api)

  return { sessionID, location, key: JSON.stringify([route.name, sessionID ?? null, location.key]) }
}
