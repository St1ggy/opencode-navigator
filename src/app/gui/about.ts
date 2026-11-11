import { createSignal } from 'solid-js'

import { parseChangelog } from '../../entities/navigator-release/model'

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
    available: () => Boolean(token()),
    async check() {
      if (busy()) return

      setBusy(true)
      setToken(undefined)
      setStatus('Checking with the native plugin manager…')
      try {
        const result = await ipc.check({
          signal: AbortSignal.any([context.signal, AbortSignal.timeout(25_000)]),
        })

        setToken(result.token)
        setStatus(`${result.message} Checked ${new Date().toLocaleTimeString()}.`)
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Update check failed. Try again.')
      } finally {
        setBusy(false)
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
            'The native plugin manager will update this package in its existing configuration scope. Restart OpenCode after completion.',
          confirm: 'Update Navigator',
          cancel: 'Cancel',
        })

        if (!confirmed || token() !== expected) return

        await ipc.install(
          { token: expected },
          { signal: AbortSignal.any([context.signal, AbortSignal.timeout(125_000)]) },
        )
        setStatus('Navigator update completed. Restart OpenCode to use it.')
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
