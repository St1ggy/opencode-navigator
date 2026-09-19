import type { SidebarSection } from '../state'

export type IconStyle = 'nerd' | 'text'

// Nerd Font glyphs, paired with font-independent ASCII fallbacks.
const ICONS = {
  todo: ['\u{EAB3}', '[T]'],
  subagents: ['\u{EA7E}', '[A]'],
  skills: ['\u{EAA4}', '[S]'],
  actions: ['\u{EB9E}', '[Q]'],
  lsp: ['\u{EAC4}', '{}'],
  mcp: ['\u{EB2D}', '[M]'],
  sections: ['\u{EBEB}', '[]'],
  scope: ['\u{EB01}', '@'],
  presets: ['\u{EBD2}', '#'],
  settings: ['\u{EB51}', '[=]'],
  reset: ['\u{EB37}', 'R'],
  save: ['\u{EB4B}', 'S'],
  add: ['\u{EA60}', '+'],
  edit: ['\u{EA73}', '[R]'],
  history: ['\u{EA82}', '[T]'],
  copy: ['\u{EBCC}', '[C]'],
  export: ['\u{EBAC}', '[E]'],
  compact: ['\u{EAF5}', '[-]'],
  checked: ['\u{EBB3}', '[x]'],
  unchecked: ['\u{EBB5}', '[ ]'], // nf-cod-circle_large matches the checked circle's size
  selected: ['\u{EAB6}', '>'],
  expanded: ['\u{EAB4}', 'v'],
  collapsed: ['\u{EAB6}', '>'],
  radioOn: ['\u{EA71}', '(*)'],
  radioOff: ['\u{EABC}', '( )'],
  done: ['\u{EAB2}', 'v'],
  busy: ['\u{EA71}', '*'],
  idle: ['\u{EABC}', '-'],
  close: ['\u{EA76}', 'x'],
  error: ['\u{EA87}', '!'],
  retry: ['\u{EA77}', '~'],
  pending: ['\u{EB19}', '...'],
  connected: ['\u{F043E}', '(*)'],
  disconnected: ['\u{F043D}', '( )'],
  favorite: ['\u{EB59}', '*'],
  favoriteEmpty: ['\u{EA6A}', '+'],
  mcpFavorite: ['\u{F00C0}', '*'],
  mcpFavoriteEmpty: ['\u{F00C3}', '+'],
  recent: ['\u{EA82}', '~'],
  info: ['\u{EA74}', 'i'],
  search: ['\u{EA6D}', '/'],
  up: ['\u{EAA1}', '^'],
  down: ['\u{EA9A}', 'v'],
  left: ['\u{EA9B}', '<'],
  right: ['\u{EA9C}', '>'],
  keyEnter: ['\u{EBEA}', 'enter'],
  keyTab: ['\u{F0312}', 'tab'],
  keyEscape: ['\u{F12B7}', 'esc'],
  keySpace: ['\u{F1050}', 'space'],
  delete: ['\u{EA81}', 'del'],
  priorityMedium: ['\u{EA71}', '-'],
  help: ['\u{EB32}', '?'],
  selectionLeft: ['\u{E0B6}', ' '],
  selectionRight: ['\u{E0B4}', ' '],
  // Inverse corner masks: paint the outside in the backdrop color over a solid selection.
  // Requires OpenCode Navigator Corners 1.001; see the installation guide.
  selectionTopLeft: ['\u{10F004}', ' '],
  selectionTopRight: ['\u{10F005}', ' '],
  selectionBottomLeft: ['\u{10F006}', ' '],
  selectionBottomRight: ['\u{10F007}', ' '],
} as const

export type UiIcon = keyof typeof ICONS

export function uiIcon(name: UiIcon, style: IconStyle = 'nerd') {
  return ICONS[name][style === 'text' ? 1 : 0]
}

const KEY_ICONS = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  enter: 'keyEnter',
  tab: 'keyTab',
  esc: 'keyEscape',
  space: 'keySpace',
  '?': 'help',
} as const

export function keyHint(keys: string, style: IconStyle = 'nerd') {
  if (style === 'text') return keys

  return keys
    .split(/([+/])/)
    .map((key) => {
      const icon = KEY_ICONS[key as keyof typeof KEY_ICONS]

      return icon ? uiIcon(icon, style) : key
    })
    .join('')
}

export function sectionIcon(section: SidebarSection, style: IconStyle = 'nerd') {
  return uiIcon(section === 'quick_actions' ? 'actions' : section, style)
}

const SETTINGS_ICONS = {
  sections: 'sections',
  scope: 'scope',
  presets: 'presets',
  behavior: 'settings',
  defaults: 'reset',
} as const

export type SettingsTab = keyof typeof SETTINGS_ICONS
export function settingsTabIcon(tab: SettingsTab, style: IconStyle = 'nerd') {
  return uiIcon(SETTINGS_ICONS[tab], style)
}

const ACTION_ICONS = {
  'session.rename': 'edit',
  'session.timeline': 'history',
  'session.copy': 'copy',
  'session.export': 'export',
  'session.compact': 'compact',
} as const

export function quickActionIcon(command: string, style: IconStyle = 'nerd') {
  return uiIcon(ACTION_ICONS[command as keyof typeof ACTION_ICONS] ?? 'actions', style)
}
