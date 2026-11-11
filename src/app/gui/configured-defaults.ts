import { createEffect, onCleanup, untrack } from 'solid-js'

import {
  configuredDefaultsFromPluginOptions,
  mergeConfiguredDefaults,
  parseConfiguredDefaults,
} from '../../entities/preferences/model'
import { NavigatorProfilesRpc } from '../../features/sidebar-settings/rpc'

import { guiPreferenceSession } from './adapters/settings-session'

import type { PreferencesController } from '../../entities/preferences/model'
import type { Context } from '@opencode/plugin/gui'

const noConfigurationTarget = async () => {
  throw new Error('The selected configuration server is unavailable. Retry after reconnecting.')
}

export function createGuiConfiguredDefaults(context: Context, preferences: PreferencesController) {
  const base = configuredDefaultsFromPluginOptions(context.options)
  let generation = 0
  let previousKey: string | undefined
  let abort: AbortController | undefined
  let load: () => Promise<void> = noConfigurationTarget

  createEffect(() => {
    const session = guiPreferenceSession(context)
    const server = session?.server ?? context.servers.get('sidecar')
    const location = session?.location ?? server?.data.location.default()
    const key = JSON.stringify([server?.id, session?.id, location])

    if (key !== previousKey) {
      previousKey = key
      untrack(() => preferences.setConfiguredDefaults(base))
    }

    abort?.abort()
    generation++
    load = noConfigurationTarget

    if (!server?.connected || !server.compatible || !location || (session && session.pending)) return

    const client = server.client
    const data = server.data
    const current = () =>
      !context.signal.aborted &&
      previousKey === key &&
      server.client === client &&
      server.data === data &&
      server.connected

    load = async () => {
      abort?.abort()
      abort = new AbortController()
      const revision = ++generation
      const signal = AbortSignal.any([context.signal, abort.signal, AbortSignal.timeout(15_000)])
      const result = await client
        .rpc(NavigatorProfilesRpc)
        .defaults(session ? { sessionID: session.id } : {}, { location, signal })

      signal.throwIfAborted()

      if (!current() || revision !== generation)
        throw new DOMException('Navigator configuration target changed', 'AbortError')

      const decoded = JSON.parse(result as string) as { defaults: Record<string, unknown>; warnings: string[] }
      const defaults = parseConfiguredDefaults({ ...decoded.defaults, mcp: decoded.defaults.desiredMcpStates })

      preferences.setConfiguredDefaults(mergeConfiguredDefaults(base, defaults))

      for (const message of decoded.warnings.slice(0, 3))
        context.toast.show({ title: 'Navigator configuration', description: message, variant: 'error' })
    }
    const refresh = () =>
      untrack(() => {
        const request = load()
        const revision = generation

        void request.catch((error: unknown) => {
          if (revision === generation && current() && !(error instanceof DOMException && error.name === 'AbortError'))
            context.toast.show({
              title: 'Navigator configuration could not be loaded; use Reload preferences to retry',
              variant: 'error',
            })
        })
      })
    const unsubscribe = data.on('config.updated', (event) => {
      if (!event.location?.directory || event.location.directory === location.directory) refresh()
    })

    refresh()
    onCleanup(() => {
      abort?.abort()
      generation++
      unsubscribe()
    })
  })

  return { reload: () => load() }
}
