import { onCleanup } from 'solid-js'

import { GuiProjectProfileDialog } from '../../features/sidebar-settings/gui'
import { NavigatorProfilesRpc } from '../../features/sidebar-settings/rpc'

import { createGuiSettingsAccess } from './adapters/settings-access'

import type { PreferencesController } from '../../entities/preferences/model'
import type { ProjectProfilePreview } from '../../features/sidebar-settings/rpc'
import type { Context } from '@opencode/plugin/gui'

export function createGuiProjectProfileDialog(context: Context, preferences: PreferencesController) {
  const access = createGuiSettingsAccess(context)

  return () => {
    const scope = access.capture()

    if (!scope) {
      context.toast.show({ title: 'Open a session before saving a project profile', variant: 'error' })

      return
    }

    const selectedScope = preferences.selectedScopeKey()
    const source = preferences.exportPortableSettings()
    const current = () =>
      access.current(scope) &&
      selectedScope === preferences.selectedScopeKey() &&
      source === preferences.exportPortableSettings()

    context.dialogs.open((dialog) => {
      const abort = new AbortController()
      const signal = AbortSignal.any([context.signal, abort.signal])

      onCleanup(() => abort.abort())

      async function preview(name: string, replace: boolean) {
        if (!current()) throw new Error('Project profile target changed. Reopen the dialog.')

        const request = access.read(scope!)
        const result = await request.client
          .rpc(NavigatorProfilesRpc)
          .preview(
            { sessionID: scope!.target.sessionID, name, source, replace },
            { location: request.location, signal },
          )

        if (!current() || !request.current()) throw new Error('Project profile target changed. Review the file again.')

        return result as ProjectProfilePreview
      }
      async function save(value: { token: string }) {
        if (!current()) throw new Error('Project profile target changed. Reopen the dialog.')

        const request = access.read(scope!)

        await request.client
          .rpc(NavigatorProfilesRpc)
          .save({ sessionID: scope!.target.sessionID, token: value.token }, { location: request.location, signal })

        if (!current() || !request.current())
          throw new Error('Outcome may have changed with the connection. Review the project file before retrying.')

        context.toast.show({
          title: 'Project profile saved; reload preferences, then apply it manually from presets',
          variant: 'success',
        })
      }

      return (
        <GuiProjectProfileDialog ui={context.ui} current={current} preview={preview} save={save} close={dialog.close} />
      )
    })
  }
}
