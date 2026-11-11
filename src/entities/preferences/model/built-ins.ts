import { DEFAULT_SECTION_EXPANSION, type PluginConfig, SIDEBAR_SECTIONS } from '../../../shared/config'

import type { ResolvedPreferences } from './schema'

export function builtInPreferences(defaults: PluginConfig): ResolvedPreferences {
  return {
    behavior: {
      toggleKey: defaults.toggleKey,
      focusKey: defaults.focusKey,
      searchKey: defaults.searchKey,
      persistMcp: defaults.persistMcp,
      limitsRefreshMinutes: defaults.limitsRefreshMinutes,
      startInChat: defaults.startInChat,
      showSessionTitle: defaults.showSessionTitle,
      showSessionDate: defaults.showSessionDate,
      cornerFont: defaults.cornerFont,
      lspIconStyle: defaults.lspIconStyle,
      rowDensity: defaults.rowDensity,
      toolbarOverflow: defaults.toolbarOverflow,
      sectionItemLimits: defaults.sectionItemLimits,
      quickActionOrder: defaults.quickActionOrder,
      quickActionVisibility: defaults.quickActionVisibility,
    },
    layout: {
      sections: defaults.sections,
      expanded: DEFAULT_SECTION_EXPANSION,
      order: defaults.sectionOrder ?? [...SIDEBAR_SECTIONS],
    },
    desiredMcpStates: {},
  }
}
