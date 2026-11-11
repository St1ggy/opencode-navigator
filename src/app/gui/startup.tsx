import { createEffect, onCleanup, untrack } from 'solid-js'

import { changesSince } from '../../entities/navigator-release/model'
import { GuiUpgradeNotesDialog } from '../../features/upgrade-notes/gui'

import type { PreferencesController } from '../../entities/preferences/model'
import type { Context } from '@opencode/plugin/gui'

export function registerGuiStartup(
  context: Context,
  preferences: PreferencesController,
  showGuide: () => unknown,
  release: { version: string; changelog: string },
) {
  let attempted = false
  let disposed = false
  let pending: ReturnType<typeof setTimeout> | undefined

  async function start() {
    const session = context.sessions.current()
    const first = await preferences.claimFirstRun()
    const previous = await preferences.claimNavigatorUpgrade(release.version)

    if (disposed || context.signal.aborted) return

    if (first && context.sessions.current() === session) showGuide()

    if (!previous) return

    const entries = changesSince(release.changelog, previous, release.version)

    if (entries.length === 0) return

    function show() {
      if (disposed || context.signal.aborted) return

      if (context.dialogs.active() || !context.sessions.current()) {
        pending = setTimeout(show, 200)

        return
      }

      context.dialogs.open((dialog) => (
        <GuiUpgradeNotesDialog
          ui={context.ui}
          previous={previous!}
          current={release.version}
          entries={entries}
          close={dialog.close}
        />
      ))
    }
    show()
  }

  createEffect(() => {
    if (attempted || !context.sessions.current() || !preferences.ready()) return

    attempted = true
    untrack(
      () =>
        void start().catch(() => {
          if (!disposed && !context.signal.aborted)
            context.toast.show({
              title: 'Navigator startup notes could not be loaded. Release notes remain available in About.',
              variant: 'error',
            })
        }),
    )
  })
  onCleanup(() => {
    disposed = true
    clearTimeout(pending)
  })
}
