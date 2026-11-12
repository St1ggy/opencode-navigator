import { createSignal } from 'solid-js'

import { parseChangelog } from '../../entities/navigator-release/model'
import { isNewerVersion } from '../../shared/lib/version'

import { createGuiBugReport } from './bug-report'
import { pluginUpdateIpc } from './ipc/plugin-update'
import { guiRelease } from './release'

import type { GuiAboutServices } from '../../features/sidebar-settings/gui'
import type { Context } from '@opencode/plugin/gui'

export function createGuiAbout(context: Context): GuiAboutServices {
  const ipc = context.main(pluginUpdateIpc(context.id))
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal('Updates have not been checked.')
  const [token, setToken] = createSignal<string>()
  const [latest, setLatest] = createSignal<string>()
  const [checking, setChecking] = createSignal(false)
  const [restart, setRestart] = createSignal(false)
  const progress = () => {
    const current = ipc.state()

    return current && current.phase !== 'idle' ? { phase: current.phase } : undefined
  }

  return {
    report: createGuiBugReport(context),
    version: guiRelease.version,
    hostVersion: context.app?.version ?? 'unknown',
    changelog: parseChangelog(guiRelease.changelog),
    status,
    busy: () => busy() || Boolean(progress()),
    progress,
    checking,
    latest,
    restart,
    available: () => Boolean(token()),
    async check() {
      if (busy()) return

      setBusy(true)
      setChecking(true)
      setToken(undefined)
      setStatus('Checking with the native plugin manager…')
      try {
        const result = await ipc.check({
          signal: AbortSignal.any([context.signal, AbortSignal.timeout(25_000)]),
        })

        setToken(result.token)
        setLatest(result.latest)

        if (result.status === 'current' && result.latest && isNewerVersion(result.latest, guiRelease.version)) {
          setRestart(true)
          setStatus(`Navigator ${result.latest} is installed. Restart OpenCode to load it.`)

          return
        }

        setStatus(`${result.message} Checked ${new Date().toLocaleTimeString()}.`)
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Update check failed. Try again.')
      } finally {
        setBusy(false)
        setChecking(false)
      }
    },
    async update() {
      const expected = token()

      if (!expected || busy()) return

      setBusy(true)
      try {
        const confirmed = await context.dialogs.confirm({
          title: 'Update Navigator?',
          description:
            'Update the existing package in its current configuration scope. Exact version pins stay pinned; OpenCode loads the new package after reloading or restarting. No unrelated settings will change.',
          confirm: 'Update Navigator',
          cancel: 'Cancel',
        })

        if (!confirmed || token() !== expected) return

        await ipc.install(
          { token: expected },
          { signal: AbortSignal.any([context.signal, AbortSignal.timeout(125_000)]) },
        )
        setStatus('Navigator update prepared. Restart OpenCode to load it.')
        setRestart(true)
        setToken(undefined)
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Update failed. Check again before retrying.')
        setToken(undefined)
      } finally {
        setBusy(false)
      }
    },
  }
}
