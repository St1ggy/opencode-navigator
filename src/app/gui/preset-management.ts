import { guiPreferenceSession } from './adapters/settings-session'

import type { PreferencesController } from '../../entities/preferences/model'
import type { GuiSettingsServices } from '../../features/sidebar-settings/gui'
import type { MonitoringRegistry } from './monitoring-registry'
import type { Context } from '@opencode/plugin/gui'

type Manage = GuiSettingsServices['presets']['manage']

function review(context: Context, kind: Parameters<Manage>[0], name: string, operation: Parameters<Manage>[2]) {
  if (operation === 'rename')
    return context.dialogs.prompt({
      title: `Rename ${kind === 'layout' ? 'layout' : 'MCP'} preset`,
      value: name,
      submit: 'Rename',
    })

  return context.dialogs.confirm({
    title: `${operation === 'delete' ? 'Delete' : 'Update'} preset ${name}?`,
    description:
      operation === 'delete'
        ? 'Remove this private preset. Current layout and connections stay unchanged.'
        : 'Replace this preset with the current selected-scope layout or observed MCP states. This does not apply it.',
    confirm: operation === 'delete' ? 'Delete preset' : 'Update preset',
    danger: operation === 'delete',
  })
}

export function createGuiPresetManagement(
  context: Context,
  preferences: PreferencesController,
  registry: MonitoringRegistry,
): GuiSettingsServices['presets']['manage'] {
  let busy = false
  const target = () => {
    const session = guiPreferenceSession(context)

    return JSON.stringify([preferences.selectedScopeKey(), session?.server.id, session?.id, session?.location])
  }

  return async (kind, name, operation) => {
    if (busy || !preferences.ready()) return

    busy = true
    try {
      const scope = target()
      const presets = () => (kind === 'layout' ? preferences.layoutPresets() : preferences.mcpPresets())
      const before = JSON.stringify(presets()[name])

      if (!before) throw new Error('Preset no longer exists. Reload preferences.')

      const catalogs = registry.active()?.catalogs
      const updatingMcp = kind === 'mcp' && operation === 'update'
      const states = updatingMcp ? catalogs?.mcp.capturePreset() : undefined
      const layout = operation === 'update' ? preferences.exportPortableSettings() : undefined
      const next = await review(context, kind, name, operation)

      if (!next) return

      if (context.signal.aborted || scope !== target() || before !== JSON.stringify(presets()[name]))
        throw new Error('Preset, scope or session changed. Review the action again.')

      if (operation === 'update' && layout !== preferences.exportPortableSettings())
        throw new Error('Selected settings changed. Review the update again.')

      if (
        updatingMcp &&
        (!catalogs ||
          catalogs !== registry.active()?.catalogs ||
          catalogs.mcp.mutating() ||
          catalogs.mcp.state().status !== 'ready' ||
          JSON.stringify(states) !== JSON.stringify(catalogs.mcp.capturePreset()))
      )
        throw new Error('MCP state changed or is unavailable. Refresh and review the update again.')

      if (kind === 'layout') {
        if (operation === 'rename') preferences.renameLayoutPreset(name, next as string)
        else if (operation === 'delete') preferences.deleteLayoutPreset(name)
        else preferences.updateLayoutPreset(name)
      } else if (operation === 'rename') preferences.renameMcpPreset(name, next as string)
      else if (operation === 'delete') preferences.deleteMcpPreset(name)
      else preferences.updateMcpPreset(name, states!)

      await preferences.flush()
      context.toast.show({ title: 'Preset saved', variant: 'success' })
    } catch (error) {
      context.toast.show({
        title:
          error instanceof Error ? error.message : 'Could not change this preset. Retry after reloading preferences.',
        variant: 'error',
      })
    } finally {
      busy = false
    }
  }
}
