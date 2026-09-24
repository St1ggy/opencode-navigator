import {
  type PluginSettings,
  QUICK_ACTION_IDS,
  SIDEBAR_SECTIONS,
  type SectionVisibility,
  type SidebarSection,
  parseQuickActionOrder,
  parseQuickActionVisibility,
  parseSectionItemLimits,
  parseSectionOrder,
  parseSectionVisibility,
} from './contracts'
import { DEFAULT_SEARCH_KEY } from './plugin-identity'

export type PluginConfig = PluginSettings & {
  sections: SectionVisibility
  sectionOrder?: SidebarSection[]
}

export function pluginConfig(options: Record<string, unknown> | undefined): PluginConfig {
  const iconStyle =
    options?.icon_style === 'nerd' || options?.icon_style === 'text' ? options.icon_style : options?.lsp_icon_style

  return {
    toggleKey:
      typeof options?.toggle_key === 'string' && options.toggle_key.trim() ? options.toggle_key.trim() : 'ctrl+shift+b',
    focusKey:
      typeof options?.focus_key === 'string' && options.focus_key.trim() ? options.focus_key.trim() : 'ctrl+shift+f',
    searchKey:
      typeof options?.search_key === 'string' && options.search_key.trim()
        ? options.search_key.trim()
        : DEFAULT_SEARCH_KEY,
    persistMcp: options?.persist_mcp !== false,
    cornerFont: options?.corner_font !== false,
    sections: parseSectionVisibility(options?.sections),
    sectionOrder: parseSectionOrder(options?.section_order) ?? [...SIDEBAR_SECTIONS],
    lspIconStyle: iconStyle === 'text' ? 'text' : 'nerd',
    rowDensity: options?.row_density === 'comfortable' ? 'comfortable' : 'compact',
    sectionItemLimits: parseSectionItemLimits(options?.section_item_limits),
    quickActionOrder: parseQuickActionOrder(options?.quick_action_order) ?? [...QUICK_ACTION_IDS],
    quickActionVisibility: parseQuickActionVisibility(options?.quick_action_visibility),
  }
}
