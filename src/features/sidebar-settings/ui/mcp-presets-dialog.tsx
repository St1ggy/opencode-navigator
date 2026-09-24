import { createDialogStack } from '../../../shared/ui'

import { McpPresetPreview } from './mcp-preset-preview'
import { PresetMenu } from './preset-menu'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function openMcpPresets(api: TuiPluginApi, controller: McpController, preferences: PreferencesController) {
  const target = controller.target()
  const dialogs = createDialogStack(
    api,
    preferences.lspIconStyle,
    () => {
      const current = controller.target()

      return current.key === target.key && current.scope === target.scope
    },
    preferences.cornerFont,
  )

  function notify(message: string) {
    api.ui.toast({ variant: 'success', title: 'MCP presets', message, duration: 3000 })
  }

  function prompt(value = '', renameFrom?: string) {
    dialogs.prompt({
      title: renameFrom ? 'Rename MCP preset' : 'Save MCP preset',
      description: () => <text fg={api.theme.current.textMuted}>Save the current enabled and disabled servers.</text>,
      placeholder: 'Preset name',
      value,
      onConfirm(input) {
        const name = renameFrom
          ? preferences.renameMcpPreset(renameFrom, input)
          : preferences.saveMcpPreset(input, controller.capturePreset())

        if (renameFrom) controller.renameSelectedPreset(renameFrom)

        notify(renameFrom ? `Renamed to ${name}` : `Saved ${name}`)
        dialogs.back()

        if (renameFrom) dialogs.back()
      },
    })
  }

  function actions(name: string) {
    dialogs.open(() => (
      <PresetMenu
        api={api}
        title={name}
        options={[
          {
            title: 'Preview & apply',
            value: 'apply',
            description: 'review server changes before applying',
            icon: 'info',
          },
          { title: 'Update from current', value: 'update', description: 'replace the saved states', icon: 'save' },
          { title: 'Rename', value: 'rename', description: 'change the preset name', icon: 'edit' },
          { title: 'Delete', value: 'delete', description: 'remove this preset', icon: 'delete' },
        ]}
        onSelect={(option) => {
          if (option.value === 'apply') {
            dialogs.open(
              () => <McpPresetPreview api={api} controller={controller} preferences={preferences} name={name} />,
              'large',
            )

            return
          }

          if (option.value === 'update') {
            try {
              const states = controller.capturePreset()

              if (!preferences.updateMcpPreset(name, states)) throw new Error('MCP preset no longer exists')

              controller.updateSelectedPreset(name)
              notify(`Updated ${name}`)
              dialogs.back()
            } catch (error) {
              api.ui.toast({
                variant: 'error',
                title: 'MCP presets',
                message: error instanceof Error ? error.message : 'Could not update the preset',
                duration: 4000,
              })
              dialogs.back()
            }

            return
          }

          if (option.value === 'rename') return prompt(name, name)

          if (!preferences.deleteMcpPreset(name)) {
            api.ui.toast({
              variant: 'warning',
              title: 'MCP presets',
              message: 'MCP preset no longer exists',
              duration: 4000,
            })
            dialogs.back()

            return
          }

          controller.clearSelectedPreset(name)
          notify(`Deleted ${name}`)
          dialogs.back()
        }}
      />
    ))
  }

  dialogs.open(() => (
    <PresetMenu
      api={api}
      title="MCP presets"
      options={[
        {
          title: 'Save current',
          value: 'save',
          description: 'Create a preset from the current server states',
          icon: 'save',
        },
        ...Object.entries(preferences.mcpPresets()).map(([name, states]) => ({
          title: name,
          value: `preset:${name}`,
          icon: 'presets' as const,
          description: `${Object.values(states).filter((state) => state === 'enabled').length}/${Object.keys(states).length} enabled`,
        })),
      ]}
      onSelect={(option) => (option.value === 'save' ? prompt() : actions(option.value.slice('preset:'.length)))}
    />
  ))
}

export { PresetMenu, PresetMenu as McpPresetMenu } from './preset-menu'
