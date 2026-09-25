import { PLUGIN_ID } from '../../../shared/config'

import type { VersionStatus, VersionUpdater } from '../model/version-status'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type UpdateKind = 'openCode' | 'navigator'

export function createVersionUpdateActions(api: TuiPluginApi, status: VersionStatus, updater: VersionUpdater) {
  const busy = new Set<UpdateKind>()

  function target(kind: UpdateKind) {
    return kind === 'openCode' ? status.openCodeUpdate() : status.navigatorUpdate()
  }

  function label(kind: UpdateKind) {
    return kind === 'openCode' ? 'OpenCode' : 'Navigator'
  }

  function update(kind: UpdateKind, version: string) {
    if (busy.has(kind)) return

    api.ui.dialog.clear()
    busy.add(kind)
    api.ui.toast({ variant: 'info', title: `Updating ${label(kind)}`, message: `Installing ${version}...` })
    void updater[kind](version)
      .then(() => {
        api.ui.toast({
          variant: 'success',
          title: `${label(kind)} updated`,
          message: 'Restart OpenCode to use the new version.',
          duration: 6000,
        })
      })
      .catch((error) => {
        api.ui.toast({
          variant: 'error',
          title: `Could not update ${label(kind)}`,
          message: error instanceof Error ? error.message : 'Update failed',
          duration: 6000,
        })
      })
      .finally(() => busy.delete(kind))
  }

  function open(kind: UpdateKind, version = target(kind)) {
    if (!version || busy.has(kind)) return

    api.ui.dialog.replace(() => (
      <api.ui.DialogConfirm
        title={`Update ${label(kind)}`}
        message={`Update to ${version} using the current installation method? OpenCode must be restarted afterward.`}
        onConfirm={() => update(kind, version)}
        onCancel={() => api.ui.dialog.clear()}
      />
    ))
  }

  const unregister = api.keymap.registerLayer({
    commands: [
      {
        name: `${PLUGIN_ID}.update-opencode`,
        title: 'Update OpenCode',
        category: 'Navigator',
        namespace: 'palette',
        enabled: () => Boolean(target('openCode')) && !busy.has('openCode'),
        run: () => open('openCode'),
      },
      {
        name: `${PLUGIN_ID}.update-navigator`,
        title: 'Update Navigator',
        category: 'Navigator',
        namespace: 'palette',
        enabled: () => Boolean(target('navigator')) && !busy.has('navigator'),
        run: () => open('navigator'),
      },
    ],
  })

  api.lifecycle.onDispose(unregister)

  return {
    openCode: (version: string) => open('openCode', version),
    navigator: (version: string) => open('navigator', version),
  }
}
