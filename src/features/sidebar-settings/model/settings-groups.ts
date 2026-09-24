import { createMemo } from 'solid-js'

import { SECTION_DEFINITIONS, SIDEBAR_SECTIONS } from '../../../entities/sidebar-layout'
import { DEFAULT_SEARCH_KEY } from '../../../shared/config'
import { supportsSidebarSection } from '../../../shared/lib/host-capabilities'

import type { PreferencesController } from '../../../entities/preferences'
import type { useIcons } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type SettingsOption = { title: string; value: string; description: string }
export type SettingsGroup = { id: string; tab: string; title: string; options: SettingsOption[] }

export function createSettingsGroups(
  api: TuiPluginApi,
  preferences: PreferencesController,
  icons: ReturnType<typeof useIcons>,
) {
  const supportedSections = () => SIDEBAR_SECTIONS.filter((name) => supportsSidebarSection(api, name))
  const groups = createMemo<SettingsGroup[]>(() => [
    {
      id: 'scope',
      tab: 'Scope',
      title: 'Preference scope',
      options: [
        {
          title: `${icons.icon(preferences.preferenceScope() === 'global' ? 'radioOn' : 'radioOff')} Global`,
          value: 'scope:global',
          description: 'applies to every worktree',
        },
        {
          title: `${icons.icon(preferences.preferenceScope() === 'worktree' ? 'radioOn' : 'radioOff')} Current worktree`,
          value: 'scope:worktree',
          description: preferences.canUseWorktreeScope()
            ? preferences.preferenceScopeLabel()
            : 'unavailable outside a worktree',
        },
      ],
    },
    {
      id: 'presets',
      tab: 'Presets',
      title: 'Layout presets',
      options: [
        ...Object.keys(preferences.layoutPresets())
          .sort((left, right) => left.localeCompare(right))
          .map((name) => ({
            title: `${icons.icon('presets')} ${name}`,
            value: `preset:custom:${encodeURIComponent(name)}`,
            description: preferences.workspaceProfiles?.()[name]
              ? `profile · ${preferences.workspaceProfiles()[name]}`
              : 'enter to apply or edit',
          })),
        {
          title: `${icons.icon('add')} Save as…`,
          value: 'save_preset',
          description: 'create a preset from the current layout',
        },
      ],
    },
    {
      id: 'sections',
      tab: 'Sections',
      title: 'Sections & order',
      options: preferences
        .selectedSectionOrder()
        .filter((name) => supportsSidebarSection(api, name))
        .map((name, index) => {
          const section = SECTION_DEFINITIONS.find((candidate) => candidate.name === name)!

          return {
            title: `${icons.icon(preferences.selectedSections()[section.name] ? 'checked' : 'unchecked')} ${index + 1}. ${icons.section(section.name)} ${section.label}`,
            value: section.name,
            description: preferences.selectedSections()[section.name] ? 'visible' : 'hidden',
          }
        }),
    },
    {
      id: 'behavior',
      tab: 'Behavior',
      title: 'Behavior',
      options: [
        {
          title: `${icons.icon(preferences.selectedPersistMcp() ? 'checked' : 'unchecked')} Remember MCP states`,
          value: 'persist_mcp',
          description: preferences.selectedPersistMcp() ? 'on' : 'off',
        },
        {
          title: `${icons.icon('settings')} Icon style`,
          value: 'lsp_icon_style',
          description: preferences.selectedLspIconStyle() === 'nerd' ? 'Nerd Font' : 'Text fallback',
        },
        {
          title: `${icons.icon(preferences.selectedCornerFont() ? 'checked' : 'unchecked')} Multiline corner font`,
          value: 'corner_font',
          description: preferences.selectedCornerFont() ? 'Installed' : 'Not installed · rectangular highlights',
        },
        {
          title: `${icons.icon('sections')} Row density`,
          value: 'row_density',
          description: preferences.selectedRowDensity() === 'compact' ? 'Compact' : 'Comfortable',
        },
        {
          title: `${icons.icon('sections')} Sidebar shortcut`,
          value: 'toggle_key',
          description: preferences.selectedToggleKey(),
        },
        {
          title: `${icons.icon('selected')} Focus shortcut`,
          value: 'focus_key',
          description: preferences.selectedFocusKey(),
        },
        {
          title: `${icons.icon('search')} Search Everything shortcut`,
          value: 'search_key',
          description: preferences.selectedSearchKey?.() ?? DEFAULT_SEARCH_KEY,
        },
      ],
    },
    {
      id: 'defaults',
      tab: 'Defaults',
      title: 'Defaults & help',
      options: [
        {
          title: `${icons.icon('save')} Save current layout as default`,
          value: 'save_layout',
          description: `${supportedSections().filter((name) => preferences.selectedSections()[name]).length} visible · ${supportedSections().filter((name) => preferences.selectedExpanded()[name]).length} expanded`,
        },
        {
          title: `${icons.icon('export')} Copy portable settings`,
          value: 'export_settings',
          description: 'versioned layout and MCP JSON',
        },
        {
          title: `${icons.icon('add')} Import portable settings…`,
          value: 'import_settings',
          description: 'preview pasted JSON before applying',
        },
        {
          title: `${icons.icon('reset')} Restore configured layout`,
          value: 'reset_sections',
          description: 'visibility and expansion',
        },
        {
          title: `${icons.icon('reset')} Restore configured behavior`,
          value: 'reset_settings',
          description: 'MCP memory, icons, shortcuts, limits, actions',
        },
        {
          title: `${icons.icon('reset')} Clear remembered MCP states`,
          value: 'reset_mcp',
          description: `scope: ${preferences.preferenceScopeLabel()}`,
        },
        {
          title: `${icons.section('skills')} Manage trusted skills`,
          value: 'trusted_skills',
          description: `${preferences.skippedSkillCount()} trusted`,
        },
        {
          title: `${icons.icon('help')} Open quick setup guide`,
          value: 'wizard',
          description: 'tips and section settings',
        },
      ],
    },
  ])
  const orderedGroups = createMemo(() =>
    ['sections', 'scope', 'presets', 'behavior', 'defaults'].map((id) => groups().find((group) => group.id === id)!),
  )

  return orderedGroups
}
