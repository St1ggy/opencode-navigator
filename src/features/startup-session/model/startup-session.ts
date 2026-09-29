import { realpathSync } from 'node:fs'

import { currentLocation } from '../../../shared/lib/location'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function routeKey(api: TuiPluginApi) {
  const route = api.route.current

  return `${route.name}:${'params' in route ? (route.params?.sessionID ?? '') : ''}`
}

function sameLocation(left: ReturnType<typeof currentLocation>, right: ReturnType<typeof currentLocation>) {
  function canonical(path: string) {
    try {
      return realpathSync(path)
    } catch {
      return path
    }
  }

  return (
    canonical(left.routing.directory) === canonical(right.routing.directory) &&
    left.routing.workspace === right.routing.workspace
  )
}

export function createStartupSessionController(api: TuiPluginApi, preferences: PreferencesController) {
  let initialized = false
  let pending = false
  let retry: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  function enabled() {
    const location = currentLocation(api)

    return (
      preferences.ready() &&
      !pending &&
      !api.ui.dialog.open &&
      preferences.startInChatForScope(location.routing.directory)
    )
  }

  async function start() {
    if (!enabled()) return

    const location = currentLocation(api)
    const originalRoute = routeKey(api)

    pending = true
    try {
      const result = await api.client.session.create(
        {
          directory: location.routing.directory,
          ...(location.routing.workspace && { workspace: location.routing.workspace }),
        },
        { signal: api.lifecycle.signal },
      )

      if (result.error || !result.data) throw result.error ?? new Error('Session creation returned no session')

      if (
        !api.lifecycle.signal?.aborted &&
        routeKey(api) === originalRoute &&
        sameLocation(currentLocation(api), location) &&
        preferences.startInChatForScope(location.routing.directory)
      ) {
        api.route.navigate('session', { sessionID: result.data.id })
      }
    } catch (error) {
      if (!api.lifecycle.signal?.aborted)
        api.ui.toast({
          variant: 'error',
          title: 'New session',
          message: error instanceof Error ? error.message : 'Could not create a session',
          duration: 5000,
        })
    } finally {
      pending = false
    }
  }

  async function initialize() {
    if (initialized) return

    initialized = true

    if (api.route.current.name !== 'home') return

    const location = currentLocation(api)

    await preferences.load()

    if (api.route.current.name !== 'home' || !sameLocation(currentLocation(api), location)) return

    function tryStart() {
      if (disposed || api.route.current.name !== 'home' || !sameLocation(currentLocation(api), location)) return

      if (api.ui.dialog.open) {
        retry = setTimeout(tryStart, 200)

        return
      }

      void start()
    }

    queueMicrotask(tryStart)
  }

  return {
    enabled,
    initialize,
    start,
    handleNewSession() {
      if (!enabled()) return false

      void start()

      return true
    },
    dispose() {
      disposed = true
      clearTimeout(retry)
    },
  }
}
