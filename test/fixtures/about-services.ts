import { createSignal } from 'solid-js'

import metadata from '../../package.json'
import { registerNavigatorAboutServices } from '../../src/features/sidebar-settings'

import type { NavigatorUpdateCheck } from '../../src/entities/navigator-release'
import type { NavigatorAboutServices } from '../../src/features/sidebar-settings'
import type { DialogNavigation } from '../../src/shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function aboutServicesFixture(api: TuiPluginApi, update: (dialogs: DialogNavigation) => void = () => {}) {
  const [state, setState] = createSignal<NavigatorUpdateCheck>({ status: 'idle' })
  let reads = 0
  let checks = 0
  let failure = false
  const entries = [
    { version: metadata.version, changes: ['Synthetic visible change'] },
    { version: '0.0.1', changes: [] },
  ]
  const service: NavigatorAboutServices = {
    navigatorVersion: metadata.version,
    openCodeVersion: metadata.devDependencies['@opencode/plugin'],
    checkState: state,
    checking: () => state().status === 'checking',
    updating: () => false,
    check: async () => {
      checks++
      setState({ status: 'current', latest: metadata.version })
    },
    update,
    changelog: async () => {
      reads++

      if (failure) throw new Error('Synthetic missing changelog')

      return entries
    },
  }
  const dispose = registerNavigatorAboutServices(api, service)

  return {
    dispose,
    service,
    setState,
    reads: () => reads,
    checks: () => checks,
    fail: () => {
      failure = true
    },
  }
}
