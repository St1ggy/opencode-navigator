import type { VersionStatus } from './version-status'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createManualUpdateCheck(
  api: TuiPluginApi,
  status: VersionStatus,
  current: () => boolean,
  onUpdate: () => void,
) {
  let checking = false

  async function read() {
    try {
      return (await status.refreshNavigator?.()) ?? 'unavailable'
    } catch {
      return 'unavailable' as const
    }
  }

  return {
    checking: () => checking,
    async run(offerUpdate = false) {
      if (!current() || checking) return

      checking = true
      api.ui.toast({ variant: 'info', title: 'Navigator update', message: 'Checking for updates…' })
      try {
        const result = await read()

        if (!current()) return

        if (result === 'update' && offerUpdate) {
          onUpdate()

          return
        }

        api.ui.toast({
          variant: result === 'unavailable' ? 'warning' : 'info',
          title: 'Navigator update',
          message: {
            update: `Navigator ${status.navigatorUpdate()} is available. Use u in Navigator shortcuts to update.`,
            current: 'Navigator is up to date.',
            unavailable: 'Could not check Navigator updates. Try again.',
          }[result],
        })
      } finally {
        checking = false
      }
    },
  }
}
