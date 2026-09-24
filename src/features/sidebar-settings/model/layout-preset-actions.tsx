import { LayoutPresetPreview } from '../ui/layout-preset-preview'
import { PresetMenu, type PresetOption } from '../ui/preset-menu'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { DialogNavigation } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createLayoutPresetActions(input: {
  api: TuiPluginApi
  preferences: PreferencesController
  mcp?: McpController
  dialogs: DialogNavigation
}) {
  function prompt(value = '', renameFrom?: string) {
    input.dialogs.prompt({
      title: renameFrom ? 'Rename layout preset' : 'Save layout preset',
      description: () => (
        <text fg={input.api.theme.current.textMuted}>Save the current visible, expanded, and ordered sections.</text>
      ),
      placeholder: 'Preset name',
      value,
      onConfirm(nameInput) {
        const name = renameFrom
          ? input.preferences.renameLayoutPreset(renameFrom, nameInput)
          : input.preferences.saveLayoutPreset(nameInput)

        input.dialogs.back()

        if (renameFrom) input.dialogs.back()

        input.api.ui.toast({
          variant: 'success',
          title: 'Layout presets',
          message: renameFrom ? `Renamed to ${name}` : `Saved ${name}`,
          duration: 3000,
        })
      },
    })
  }

  function open(name: string) {
    const linked = input.preferences.workspaceProfiles?.()[name]
    const link = () =>
      input.dialogs.prompt({
        title: `Link MCP · ${name}`,
        placeholder: 'Preset; empty unlinks',
        value: linked ?? '',
        onConfirm(value) {
          input.preferences.linkWorkspaceProfile?.(name, value.trim() || undefined)
          input.dialogs.back()
          input.dialogs.back()
        },
      })

    input.dialogs.open(() => (
      <PresetMenu
        api={input.api}
        title={name}
        options={
          [
            {
              title: 'Preview & apply',
              value: 'apply',
              icon: 'info',
              description: linked ? `profile · ${linked}` : 'review layout changes',
            },
            {
              title: 'Update from current',
              value: 'update',
              icon: 'save',
              description: 'replace saved layout',
            },
            { title: 'Rename…', value: 'rename', description: 'change preset name', icon: 'edit' },
            ...(input.mcp
              ? [
                  {
                    title: linked ? 'Change MCP link…' : 'Link MCP preset…',
                    value: 'link',
                    icon: 'mcp',
                    description: linked ? `${linked} · empty unlinks` : 'pair layout and MCP',
                  },
                ]
              : []),
            { title: 'Delete', value: 'delete', description: 'remove preset', icon: 'delete' },
          ] as PresetOption[]
        }
        onSelect={(option) => {
          switch (option.value) {
            case 'apply': {
              input.dialogs.open(
                () => (
                  <LayoutPresetPreview
                    api={input.api}
                    preferences={input.preferences}
                    controller={input.mcp}
                    name={name}
                  />
                ),
                'large',
              )

              break
            }

            case 'update': {
              input.preferences.updateLayoutPreset(name)
              input.dialogs.back()
              input.api.ui.toast({
                variant: 'success',
                title: 'Layout presets',
                message: `Updated ${name}`,
                duration: 3000,
              })

              break
            }

            case 'rename': {
              prompt(name, name)

              break
            }

            case 'link': {
              link()

              break
            }

            default: {
              input.preferences.deleteLayoutPreset(name)
              input.dialogs.back()
            }
          }
        }}
      />
    ))
  }

  return { open, prompt }
}
