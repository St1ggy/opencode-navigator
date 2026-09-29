import { createSignal } from 'solid-js'

import { isNewerVersion } from '../../../shared/lib/version'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Accessor } from 'solid-js'

const NAVIGATOR_PACKAGE_URL = 'https://registry.npmjs.org/opencode-navigator/latest'
const REQUEST_TIMEOUT_MS = 5000

export type VersionStatus = {
  openCodeUpdate: Accessor<string | undefined>
  navigatorUpdate: Accessor<string | undefined>
}

export type VersionUpdater = {
  openCode: (target: string) => Promise<void>
  navigator: (target: string) => Promise<void>
}

export { isNewerVersion } from '../../../shared/lib/version'

export function createVersionStatus(
  api: TuiPluginApi,
  navigatorVersion: string,
  request: typeof fetch = fetch,
): VersionStatus {
  const [openCodeUpdate, setOpenCodeUpdate] = createSignal<string>()
  const [navigatorUpdate, setNavigatorUpdate] = createSignal<string>()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const unsubscribe = api.event.on('installation.update-available', (event) => {
    const version = event.properties.version

    setOpenCodeUpdate(isNewerVersion(version, api.app.version) ? version : undefined)
  })

  api.lifecycle.onDispose(() => {
    clearTimeout(timeout)
    controller.abort()
    unsubscribe()
  })

  void request(NAVIGATOR_PACKAGE_URL, {
    headers: { accept: 'application/json' },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) return

      const metadata = (await response.json()) as { version?: unknown }

      if (typeof metadata.version === 'string')
        setNavigatorUpdate(isNewerVersion(metadata.version, navigatorVersion) ? metadata.version : undefined)
    })
    .catch(() => {})
    .finally(() => clearTimeout(timeout))

  return { openCodeUpdate, navigatorUpdate }
}
