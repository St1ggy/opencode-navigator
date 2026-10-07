import { PLUGIN_ID } from '../../../shared/config'
import { createManualUpdateCheck } from '../model/manual-update-check'

import type { VersionStatus, VersionUpdater } from '../model/version-status'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type UpdateKind = 'openCode' | 'navigator'

export function createVersionUpdateActions(
  api: TuiPluginApi,
  status: VersionStatus,
  updater: VersionUpdater,
  rememberNavigatorVersion?: () => Promise<void>,
) {
  const busy = new Set<UpdateKind>()
  const installed: Partial<Record<UpdateKind, string>> = {}
  let disposed = false
  let confirmation = 0

  function target(kind: UpdateKind) {
    return kind === 'openCode' ? status.openCodeUpdate() : status.navigatorUpdate()
  }

  function label(kind: UpdateKind) {
    return kind === 'openCode' ? 'OpenCode' : 'Navigator'
  }

  function update(kind: UpdateKind, version: string) {
    if (disposed || busy.has(kind)) return

    if (version !== target(kind)) {
      api.ui.toast({
        variant: 'warning',
        title: 'Update changed',
        message: 'Check for updates again before confirming.',
      })

      return
    }

    api.ui.dialog.clear()
    busy.add(kind)
    api.ui.toast({ variant: 'info', title: `Updating ${label(kind)}`, message: `Installing ${version}...` })
    void (async () => {
      if (kind === 'navigator') await rememberNavigatorVersion?.()

      if (disposed || version !== target(kind)) throw new Error('Update target changed; check again')

      await updater[kind](version)
    })()
      .then(() => {
        installed[kind] = version

        if (disposed) return

        api.ui.toast({
          variant: 'success',
          title: `${label(kind)} updated`,
          message: 'Restart OpenCode to use the new version.',
          duration: 6000,
        })
      })
      .catch((error) => {
        if (disposed) return

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
    if (disposed || !version || version !== target(kind) || busy.has(kind)) return

    if (installed[kind] === version) {
      api.ui.toast({
        variant: 'info',
        title: `${label(kind)} updated`,
        message: 'Restart OpenCode to use the installed update.',
      })

      return
    }

    const id = ++confirmation

    api.ui.dialog.replace(() => (
      <api.ui.DialogConfirm
        title={`Update ${label(kind)}`}
        message={`Update to ${version} using the current installation method? OpenCode must be restarted afterward.`}
        onConfirm={() => {
          if (id !== confirmation) return

          confirmation++
          update(kind, version)
        }}
        onCancel={() => {
          if (id !== confirmation) return

          confirmation++
          api.ui.dialog.clear()
        }}
      />
    ))
  }

  const manual = createManualUpdateCheck(
    api,
    status,
    () => !disposed && !busy.has('navigator'),
    () => open('navigator'),
  )

  const unregister = api.keymap.registerLayer({
    commands: [
      {
        name: `${PLUGIN_ID}.check-update`,
        title: 'Check Navigator updates',
        category: 'Navigator',
        namespace: 'palette',
        enabled: () => !manual.checking() && !busy.has('navigator'),
        run: () => void manual.run(),
      },
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
        enabled: () => !manual.checking() && !busy.has('navigator'),
        run: () => void manual.run(true),
      },
    ],
  })

  api.lifecycle.onDispose(() => {
    disposed = true
    unregister()
  })

  return {
    openCode: (version: string) => open('openCode', version),
    navigator: (version: string) => open('navigator', version),
  }
}
