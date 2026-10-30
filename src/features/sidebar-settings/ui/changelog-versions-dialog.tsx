import { Show, onCleanup, onMount } from 'solid-js'

import { isNewerVersion } from '../../../shared/lib/version'
import {
  DialogAction,
  DialogHeader,
  DialogSurface,
  SelectionMenu,
  useDialogState,
  useDialogs,
} from '../../../shared/ui'

import { ChangelogVersionDialog } from './changelog-version-dialog'

import type { ChangelogEntry } from '../../../entities/navigator-release'
import type { NavigatorAboutServices } from '../model/about-services'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ChangelogVersionsDialog(props: { api: TuiPluginApi; service: NavigatorAboutServices }) {
  const dialogs = useDialogs(props.api)
  const [entries, setEntries] = useDialogState<ChangelogEntry[] | undefined>('releases', undefined)
  const [error, setError] = useDialogState('read-error', '')
  let disposed = false
  const load = async () => {
    setError('')
    try {
      const result = await props.service.changelog()

      if (!disposed)
        setEntries(result.filter((entry) => !isNewerVersion(entry.version, props.service.navigatorVersion)))
    } catch {
      if (!disposed) setError('Could not read the bundled changelog. Retry to read it again.')
    }
  }

  onMount(() => {
    if (!entries()) void load()
  })
  onCleanup(() => {
    disposed = true
  })
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    commands: [
      {
        name: 'opencode-navigator.changelog.retry',
        enabled: () => Boolean(error()) && !entries(),
        run: () => void load(),
      },
    ],
    bindings: [{ key: 'return', cmd: 'opencode-navigator.changelog.retry' }],
  })

  onCleanup(unregister)

  return (
    <Show
      when={entries()}
      fallback={
        <DialogSurface api={props.api} lift>
          <DialogHeader api={props.api} title="Navigator changelog" onBack={dialogs.back} />
          <text wrapMode="word" fg={props.api.theme.current.textMuted}>
            {error() || 'Loading bundled release notes…'}
          </text>
          <Show when={error()}>
            <DialogAction
              api={props.api}
              id="opencode-navigator.changelog.retry"
              label="Retry"
              icon="retry"
              selected
              onSelect={() => {}}
              onActivate={() => void load()}
            />
          </Show>
        </DialogSurface>
      }
    >
      {(versions) => (
        <Show
          when={versions().length > 0}
          fallback={
            <DialogSurface api={props.api} lift>
              <DialogHeader api={props.api} title="Navigator changelog" onBack={dialogs.back} />
              <text fg={props.api.theme.current.textMuted}>No release notes are bundled with this installation.</text>
            </DialogSurface>
          }
        >
          <SelectionMenu
            api={props.api}
            title="Navigator changelog"
            options={versions().map((entry) => ({
              title: `Navigator ${entry.version}`,
              value: entry.version,
              description: entry.changes.length > 0 ? `${entry.changes.length} changes` : 'No user-facing changes',
            }))}
            onSelect={(option) => {
              const entry = versions().find((item) => item.version === option.value)

              if (entry) dialogs.open(() => <ChangelogVersionDialog api={props.api} entry={entry} />)
            }}
          />
        </Show>
      )}
    </Show>
  )
}
