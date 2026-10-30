import { registerNavigatorAboutServices } from '../features/sidebar-settings'

import type { ChangelogEntry } from '../entities/navigator-release'
import type { VersionStatus, createVersionUpdateActions } from '../features/version-footer'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function bindNavigatorAbout(
  api: TuiPluginApi,
  status: VersionStatus,
  updates: ReturnType<typeof createVersionUpdateActions>,
  notes: { readBundledChangelog(): Promise<string>; parseChangelog(source: string): ChangelogEntry[] },
) {
  const dispose = registerNavigatorAboutServices(api, {
    navigatorVersion: __NAVIGATOR_VERSION__,
    openCodeVersion: api.app.version,
    checkState: () => status.navigatorCheckState?.() ?? { status: 'idle' },
    checking: () => status.navigatorCheckState?.().status === 'checking',
    updating: updates.navigatorUpdating,
    installed: updates.navigatorInstalled,
    check: () => status.refreshNavigator?.() ?? Promise.resolve('unavailable'),
    update(dialogs) {
      const target = status.navigatorUpdate()

      if (target) updates.navigator(target, dialogs)
    },
    changelog: async () => notes.parseChangelog(await notes.readBundledChangelog()),
  })

  api.lifecycle.onDispose(dispose)
}
