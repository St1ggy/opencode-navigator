import { createSignal } from 'solid-js'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Accessor } from 'solid-js'

const NAVIGATOR_PACKAGE_URL = 'https://registry.npmjs.org/opencode-navigator/latest'
const REQUEST_TIMEOUT_MS = 5000

export type VersionStatus = {
  openCodeUpdate: Accessor<boolean>
  navigatorUpdate: Accessor<boolean>
}

function versionParts(value: string) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?/.exec(value)

  return match ? { numbers: match.slice(1, 4).map(Number), prerelease: match[4] || undefined } : undefined
}

export function isNewerVersion(latest: string, current: string) {
  const next = versionParts(latest)
  const installed = versionParts(current)

  if (!next || !installed) return false

  for (let index = 0; index < 3; index++) {
    if (next.numbers[index] !== installed.numbers[index]) return next.numbers[index] > installed.numbers[index]
  }

  return installed.prerelease !== undefined && next.prerelease === undefined
}

export function createVersionStatus(
  api: TuiPluginApi,
  navigatorVersion: string,
  request: typeof fetch = fetch,
): VersionStatus {
  const [openCodeUpdate, setOpenCodeUpdate] = createSignal(false)
  const [navigatorUpdate, setNavigatorUpdate] = createSignal(false)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const unsubscribe = api.event.on('installation.update-available', (event) => {
    setOpenCodeUpdate(isNewerVersion(event.properties.version, api.app.version))
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

      if (typeof metadata.version === 'string') setNavigatorUpdate(isNewerVersion(metadata.version, navigatorVersion))
    })
    .catch(() => {})
    .finally(() => clearTimeout(timeout))

  return { openCodeUpdate, navigatorUpdate }
}
