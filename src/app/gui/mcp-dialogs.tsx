import { GuiMcpPresetMenu, GuiMcpPresetPreview } from '../../features/sidebar-settings/gui'
import { createMcpPresetPreview } from '../../features/sidebar-settings/model'

import { createGuiSettingsAccess } from './adapters/settings-access'

import type { McpItem } from '../../entities/mcp/model'
import type { PreferencesController } from '../../entities/preferences/model'
import type { MonitoringRuntime } from '../../pages/navigator/model'
import type { Context } from '@opencode/plugin/gui'

export function createGuiMcpDialogs(
  context: Context,
  runtime: () => MonitoringRuntime | undefined,
  preferences: PreferencesController,
) {
  const Dialog = context.ui.Dialog
  const Button = context.ui.Button
  const access = createGuiSettingsAccess(context)

  return {
    presets() {
      const scope = access.capture()
      const catalogs = runtime()?.catalogs

      if (!scope || !catalogs) return

      const selectedScope = scope
      const controller = catalogs.mcp
      const current = () => access.current(selectedScope)

      function preview(name: string, applied: () => void) {
        if (!current()) return

        context.dialogs.open((dialog) => {
          const model = createMcpPresetPreview(controller, preferences, name, current)

          async function apply() {
            const request = model.apply()

            if (!request) return false

            await request

            if (!current()) return false

            if (controller.bulkState().failed.length > 0)
              throw new Error('Some servers could not change. Review the MCP section and retry the failed servers.')

            applied()

            return true
          }

          return (
            <GuiMcpPresetPreview
              ui={context.ui}
              name={name}
              model={model}
              persistent={controller.persist()}
              apply={apply}
              close={dialog.close}
            />
          )
        })
      }

      context.dialogs.open((menu) => (
        <GuiMcpPresetMenu
          ui={context.ui}
          current={current}
          close={menu.close}
          names={Object.keys(preferences.mcpPresets()).sort((left, right) => left.localeCompare(right))}
          preview={(name) => preview(name, menu.close)}
        />
      ))
    },
    information(item: McpItem) {
      const snapshot = { ...item }

      context.dialogs.open((dialog) => (
        <Dialog
          title={`MCP · ${snapshot.name}`}
          size="large"
          description={`Status: ${snapshot.status}`}
          footer={<Button onClick={dialog.close}>Close</Button>}
        >
          <pre style={{ 'white-space': 'pre-wrap', 'overflow-wrap': 'anywhere' }}>
            {snapshot.error || 'The server supplied no additional error details.'}
          </pre>
        </Dialog>
      ))
    },
  }
}
