import { DEFAULT_SEARCH_KEY } from './constants'
import { parseSectionItemLimits, parseSectionOrder } from './preferences-schema'
import { QUICK_ACTION_IDS, parseQuickActionOrder, parseQuickActionVisibility } from './quick-actions'
import { SIDEBAR_SECTIONS, type SectionVisibility, type SidebarSection, parseSectionVisibility } from './state'

import type { PluginSettings } from './preferences-schema'

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
    sections: parseSectionVisibility(options?.sections),
    sectionOrder: parseSectionOrder(options?.section_order) ?? [...SIDEBAR_SECTIONS],
    lspIconStyle: iconStyle === 'text' ? 'text' : 'nerd',
    sectionItemLimits: parseSectionItemLimits(options?.section_item_limits),
    quickActionOrder: parseQuickActionOrder(options?.quick_action_order) ?? [...QUICK_ACTION_IDS],
    quickActionVisibility: parseQuickActionVisibility(options?.quick_action_visibility),
  }
}
