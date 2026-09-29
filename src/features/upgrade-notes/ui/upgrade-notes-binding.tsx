import { onCleanup, onMount } from 'solid-js'

import { createDialogStack } from '../../../shared/ui'
import { changesSince, readBundledChangelog } from '../model/changelog'

import { UpgradeNotesDialog } from './upgrade-notes-dialog'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function UpgradeNotesBinding(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  version: string
  read?: () => Promise<string>
}) {
  let pending: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  onMount(async () => {
    const previous = await props.preferences.claimNavigatorUpgrade(props.version)

    if (!previous || disposed) return

    try {
      const entries = changesSince(await (props.read ?? readBundledChangelog)(), previous, props.version)

      if (entries.length === 0 || disposed) return

      function show() {
        if (disposed || props.api.lifecycle.signal?.aborted) return

        if (props.api.ui.dialog.open) {
          pending = setTimeout(show, 200)

          return
        }

        createDialogStack(props.api, props.preferences.lspIconStyle, () => true, props.preferences.cornerFont).open(
          () => <UpgradeNotesDialog api={props.api} previous={previous!} current={props.version} entries={entries} />,
          'large',
        )
      }
      show()
    } catch {
      // The release package may be missing notes; keep startup usable.
    }
  })
  onCleanup(() => {
    disposed = true
    clearTimeout(pending)
  })

  return <box />
}
