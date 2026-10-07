import { createSignal } from 'solid-js'

import { isNewerVersion } from '../../../shared/lib/version'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Accessor } from 'solid-js'

const NAVIGATOR_PACKAGE_URL = 'https://registry.npmjs.org/opencode-navigator/latest'
const REQUEST_TIMEOUT_MS = 5000

export type VersionStatus = {
  openCodeUpdate: Accessor<string | undefined>
  navigatorUpdate: Accessor<string | undefined>
  refreshNavigator?: () => Promise<'update' | 'current' | 'unavailable'>
}

export type VersionUpdater = {
  openCode: (target: string) => Promise<void>
  navigator: (target: string) => Promise<void>
}

export { isNewerVersion } from '../../../shared/lib/version'

async function readNavigatorVersion(request: typeof fetch, signal: AbortSignal) {
  const response = await request(NAVIGATOR_PACKAGE_URL, { headers: { accept: 'application/json' }, signal })

  if (!response.ok) throw new Error('Update source unavailable')

  const metadata = (await response.json()) as { version?: unknown }

  if (typeof metadata.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(metadata.version))
    throw new Error('Invalid update version')

  return metadata.version
}

export function createVersionStatus(
  api: TuiPluginApi,
  navigatorVersion: string,
  request: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
): VersionStatus {
  const [openCodeUpdate, setOpenCodeUpdate] = createSignal<string>()
  const [navigatorUpdate, setNavigatorUpdate] = createSignal<string>()
  let controller: AbortController | undefined
  let pending: ReturnType<NonNullable<VersionStatus['refreshNavigator']>> | undefined
  let disposed = false
  const unsubscribe = api.event.on('installation.update-available', (event) => {
    const version = event.properties.version

    setOpenCodeUpdate(isNewerVersion(version, api.app.version) ? version : undefined)
  })

  api.lifecycle.onDispose(() => {
    disposed = true
    controller?.abort()
    unsubscribe()
  })

  function refreshNavigator(): ReturnType<NonNullable<VersionStatus['refreshNavigator']>> {
    if (disposed) return Promise.resolve('unavailable')

    if (pending) return pending

    const active = new AbortController()

    controller = active
    const timeout = setTimeout(() => active.abort(), timeoutMs)
    let abort!: () => void
    const cancelled = new Promise<never>((_, reject) => {
      abort = () => reject(new Error('Update check interrupted'))
      active.signal.addEventListener('abort', abort, { once: true })
    })
    const reading = Promise.race([readNavigatorVersion(request, active.signal), cancelled])
      .then((version) => {
        if (disposed || active.signal.aborted) return 'unavailable' as const

        const newer = isNewerVersion(version, navigatorVersion)

        setNavigatorUpdate(newer ? version : undefined)

        return newer ? ('update' as const) : ('current' as const)
      })
      .catch(() => 'unavailable' as const)
      .finally(() => {
        clearTimeout(timeout)
        active.signal.removeEventListener('abort', abort)

        if (controller === active) controller = undefined

        if (pending === reading) pending = undefined
      })

    pending = reading

    return reading
  }

  void refreshNavigator()

  return { openCodeUpdate, navigatorUpdate, refreshNavigator }
}
