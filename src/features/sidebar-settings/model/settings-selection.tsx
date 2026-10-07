import { SECTION_DEFINITIONS, type SidebarSection } from '../../../entities/sidebar-layout'
import { FirstRunWizard } from '../ui/first-run-wizard'

import { openLimitsRefreshPrompt } from './limits-refresh-prompt'

import type { SettingsOption } from './settings-groups'
import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { SkillController } from '../../../entities/skill'
import type { DialogNavigation } from '../../../shared/ui'
import type { McpGroupsDialog as McpGroupsComponent } from '../ui/mcp-groups-dialog'
import type { QuickActionsDialog as QuickActionsComponent } from '../ui/quick-actions-dialog'
import type { openSettingsImport as ImportSettingsFunction } from '../ui/settings-import-dialog'
import type { SkillGroupsDialog as SkillGroupsComponent } from '../ui/skill-groups-dialog'
import type { TrustedSkillsDialog as TrustedSkillsComponent } from '../ui/trusted-skills-dialog'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Accessor, Setter } from 'solid-js'

export function createSettingsSelection(input: {
  api: TuiPluginApi
  preferences: PreferencesController
  mcp?: McpController
  skills?: SkillController
  dialogs: DialogNavigation
  options: Accessor<SettingsOption[]>
  active: Accessor<number>
  setActive: Setter<number>
  openPreset: (name: string) => void
  promptPreset: () => void
}) {
  const dialogClosed = () => 'open' in input.api.ui.dialog && !input.api.ui.dialog.open

  function openLimitPrompt(section: SidebarSection) {
    const index = input.options().findIndex((option) => option.value === section)

    if (index !== -1) input.setActive(index)

    input.dialogs.prompt({
      title: `${SECTION_DEFINITIONS.find((item) => item.name === section)!.label} item limit`,
      description: () => (
        <text fg={input.api.theme.current.textMuted}>Visible items before Show all. Enter 0 for All.</text>
      ),
      value: String(input.preferences.selectedSectionItemLimit(section)),
      onConfirm(value) {
        if (!/^\d+$/.test(value.trim())) throw new Error('Enter a non-negative whole number (0 for All)')

        input.preferences.setSectionItemLimit(section, Number(value))
        input.dialogs.back()
      },
    })
  }
  function openShortcut(value: 'toggle_key' | 'focus_key' | 'search_key') {
    const bindings = {
      toggle_key: {
        title: 'Sidebar shortcut',
        get: input.preferences.selectedToggleKey,
        set: input.preferences.setToggleKey,
      },
      focus_key: {
        title: 'Focus shortcut',
        get: input.preferences.selectedFocusKey,
        set: input.preferences.setFocusKey,
      },
      search_key: {
        title: 'Search Everything shortcut',
        get: input.preferences.selectedSearchKey,
        set: input.preferences.setSearchKey,
      },
    }
    const binding = bindings[value]

    input.dialogs.prompt({
      title: binding.title,
      description: () => (
        <text fg={input.api.theme.current.textMuted}>Use OpenCode key syntax, for example alt+s.</text>
      ),
      value: binding.get(),
      onConfirm(key) {
        binding.set(key)
        input.dialogs.back()
      },
    })
  }
  function saveLayout() {
    void input.preferences
      .saveLayoutAsDefault()
      .then(() =>
        input.api.ui.toast({
          variant: 'success',
          title: 'Navigator settings',
          message: 'Current layout saved as default',
          duration: 3000,
        }),
      )
      .catch((error) =>
        input.api.ui.toast({
          variant: 'error',
          title: 'Navigator settings',
          message: error instanceof Error ? error.message : 'Failed to save the default layout',
          duration: 5000,
        }),
      )
  }
  function exportSettings() {
    const copied = input.api.renderer.copyToClipboardOSC52(input.preferences.exportPortableSettings())

    input.api.ui.toast({
      variant: copied ? 'success' : 'warning',
      title: 'Portable settings',
      message: copied ? 'Layout and MCP settings copied as JSON' : 'Terminal clipboard is unavailable',
      duration: 4000,
    })
  }
  function importSettings() {
    const path = import.meta.url.includes('/dist/tui.js') ? './settings-import.js' : '../ui/settings-import-dialog'

    void import(path)
      .then((module) => {
        if (!dialogClosed()) (module as { openSettingsImport: typeof ImportSettingsFunction }).openSettingsImport(input)
      })
      .catch((error) => input.api.ui.toast({ variant: 'error', title: 'Portable settings', message: String(error) }))
  }
  function select(value = input.options()[input.active()]?.value) {
    if (!value) return

    const index = input.options().findIndex((option) => option.value === value)

    if (index !== -1) input.setActive(index)

    if (value === 'scope:global' || value === 'scope:worktree')
      input.preferences.setPreferenceScope(value === 'scope:global' ? 'global' : 'worktree')
    else if (value.startsWith('preset:custom:'))
      input.openPreset(decodeURIComponent(value.slice('preset:custom:'.length)))
    else
      switch (value) {
        case 'save_preset': {
          input.promptPreset()
          break
        }

        case 'save_layout': {
          saveLayout()
          break
        }

        case 'export_settings': {
          exportSettings()
          break
        }

        case 'import_settings': {
          importSettings()
          break
        }

        case 'reload_settings': {
          void input.preferences
            .reloadFromFile()
            .then(() =>
              input.api.ui.toast({
                variant: 'success',
                title: 'Navigator settings',
                message: 'Saved settings reloaded',
                duration: 3000,
              }),
            )
            .catch((error) =>
              input.api.ui.toast({
                variant: 'error',
                title: 'Navigator settings',
                message: error instanceof Error ? error.message : 'Could not reload saved settings',
                duration: 5000,
              }),
            )
          break
        }

        case 'reset_sections': {
          input.preferences.resetSections()
          break
        }

        case 'session_title': {
          input.preferences.toggleSessionTitleVisibility()
          break
        }

        case 'session_date': {
          input.preferences.toggleSessionDateVisibility()
          break
        }

        case 'persist_mcp': {
          input.preferences.toggleMcpPersistence()
          break
        }

        case 'limits_refresh': {
          openLimitsRefreshPrompt(input.api, input.preferences, input.dialogs)
          break
        }

        case 'start_in_chat': {
          input.preferences.toggleStartInChat()
          break
        }

        case 'auto_approve_permissions': {
          input.preferences.setAutoApprovePermissions(input.preferences.autoApprovePermissions() !== true)
          break
        }

        case 'lsp_icon_style': {
          input.preferences.toggleLspIconStyle()
          break
        }

        case 'corner_font': {
          input.preferences.toggleCornerFont()
          break
        }

        case 'row_density': {
          input.preferences.toggleRowDensity()
          break
        }

        case 'toggle_key': {
          openShortcut('toggle_key')
          break
        }

        case 'focus_key': {
          openShortcut('focus_key')
          break
        }

        case 'search_key': {
          openShortcut('search_key')
          break
        }

        case 'reset_settings': {
          input.preferences.resetPluginSettings()
          break
        }

        case 'reset_mcp': {
          input.preferences.resetMcpStates()
          break
        }

        case 'trusted_skills': {
          const path = import.meta.url.includes('/dist/tui.js') ? './trusted-skills.js' : '../ui/trusted-skills-dialog'

          void import(path)
            .then((module) => {
              if (dialogClosed()) return

              const { TrustedSkillsDialog } = module as { TrustedSkillsDialog: typeof TrustedSkillsComponent }

              input.dialogs.open(() => <TrustedSkillsDialog api={input.api} preferences={input.preferences} />)
            })
            .catch((error) => input.api.ui.toast({ variant: 'error', title: 'Trusted skills', message: String(error) }))
          break
        }

        case 'wizard': {
          input.dialogs.open(() => <FirstRunWizard api={input.api} preferences={input.preferences} />)
          break
        }
        default: {
          input.preferences.toggleSelectedSection(value as SidebarSection)
        }
      }
  }
  function openQuickActions() {
    input.setActive(input.options().findIndex((option) => option.value === 'quick_actions'))
    const path = import.meta.url.includes('/dist/tui.js') ? './quick-actions-settings.js' : '../ui/quick-actions-dialog'

    void import(path)
      .then((module) => {
        if (dialogClosed()) return

        const { QuickActionsDialog } = module as { QuickActionsDialog: typeof QuickActionsComponent }

        input.dialogs.open(() => <QuickActionsDialog api={input.api} preferences={input.preferences} />)
      })
      .catch((error) => {
        input.api.ui.toast({ variant: 'error', title: 'Quick actions', message: String(error), duration: 4000 })
      })
  }
  function openMcpGroups() {
    if (!input.mcp) return

    input.setActive(input.options().findIndex((option) => option.value === 'mcp'))
    const path = import.meta.url.includes('/dist/tui.js') ? './mcp-groups.js' : '../ui/mcp-groups-dialog'

    void import(path)
      .then((module) => {
        if (dialogClosed()) return

        const { McpGroupsDialog } = module as { McpGroupsDialog: typeof McpGroupsComponent }

        input.dialogs.open(() => <McpGroupsDialog api={input.api} preferences={input.preferences} mcp={input.mcp!} />)
      })
      .catch((error) => {
        input.api.ui.toast({ variant: 'error', title: 'MCP groups', message: String(error), duration: 4000 })
      })
  }

  function openSkillGroups() {
    if (!input.skills) return

    input.setActive(input.options().findIndex((option) => option.value === 'skills'))
    const path = import.meta.url.includes('/dist/tui.js') ? './skill-groups.js' : '../ui/skill-groups-dialog'

    void import(path)
      .then((module) => {
        if (dialogClosed()) return

        const { SkillGroupsDialog } = module as { SkillGroupsDialog: typeof SkillGroupsComponent }

        input.dialogs.open(() => (
          <SkillGroupsDialog api={input.api} preferences={input.preferences} skills={input.skills!} />
        ))
      })
      .catch((error) => {
        input.api.ui.toast({ variant: 'error', title: 'Skill groups', message: String(error), duration: 4000 })
      })
  }

  return { openLimitPrompt, openMcpGroups, openSkillGroups, openQuickActions, select }
}
