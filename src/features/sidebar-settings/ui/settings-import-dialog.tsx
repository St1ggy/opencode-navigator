import { type DialogNavigation, SelectionMenu, type SelectionOption } from '../../../shared/ui'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function openSettingsImport(input: {
  api: TuiPluginApi
  preferences: PreferencesController
  dialogs: DialogNavigation
}) {
  input.dialogs.prompt({
    title: 'Import portable settings',
    description: () => <text fg={input.api.theme.current.textMuted}>Paste versioned Navigator JSON.</text>,
    onConfirm(source) {
      const preview = input.preferences.previewPortableSettings(source)
      const options: SelectionOption[] = [
        ...(preview.settings.layout
          ? [
              {
                title: `Layout · ${preview.layoutChanged ? 'CHANGED' : 'UNCHANGED'}`,
                value: 'status',
                description: `${Object.keys(preview.settings.layout.sections).length} visibility · ${Object.keys(preview.settings.layout.expanded).length} expansion values`,
                icon: preview.layoutChanged ? ('edit' as const) : ('done' as const),
              },
            ]
          : []),
        ...(preview.settings.mcp
          ? [
              {
                title: `MCP · ${preview.mcpChanged ? 'CHANGED' : 'UNCHANGED'}`,
                value: 'status',
                description: `${Object.keys(preview.settings.mcp).length} remembered server states`,
                icon: preview.mcpChanged ? ('edit' as const) : ('done' as const),
              },
            ]
          : []),
        ...preview.unsupported.map((path: string) => ({
          title: 'Unsupported field · SKIPPED',
          value: 'status',
          description: path,
          icon: 'error' as const,
        })),
        ...(preview.layoutChanged || preview.mcpChanged
          ? [{ title: 'Apply imported settings', value: 'apply', description: preview.target, icon: 'done' as const }]
          : []),
        { title: 'Cancel', value: 'cancel', description: 'return without changes', icon: 'close' },
      ]
      let applying = false

      async function apply() {
        applying = true
        try {
          await input.preferences.applyPortableSettings(preview)
          input.api.ui.toast({
            variant: 'success',
            title: 'Portable settings',
            message: 'Layout and MCP settings imported',
            duration: 3000,
          })
          input.dialogs.back()
        } catch (error) {
          applying = false
          input.api.ui.toast({
            variant: 'error',
            title: 'Portable settings',
            message: error instanceof Error ? error.message : 'Could not import settings',
            duration: 5000,
          })
        }
      }

      input.dialogs.replace(() => (
        <SelectionMenu
          api={input.api}
          title="Settings import preview"
          options={options}
          height={Math.min(options.length * 3, 18)}
          onSelect={(option) => {
            if (option.value === 'cancel') input.dialogs.back()

            if (option.value !== 'apply' || applying) return

            void apply()
          }}
        />
      ))
    },
  })
}
