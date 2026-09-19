import { quickActionIcon } from './icons/ui'

import type { SectionVisibility, SidebarSection } from './state'

export const PLUGIN_ID = 'opencode-navigator'
export const LEGACY_PLUGIN_ID = 'opencode-pretty-sidebar'
export const TOGGLE_COMMAND = `${PLUGIN_ID}.toggle`
export const FOCUS_COMMAND = `${PLUGIN_ID}.focus`
export const SEARCH_COMMAND = `${PLUGIN_ID}.search`
export const DEFAULT_SEARCH_KEY = 'ctrl+shift+k'
export const DEFAULT_SECTION_EXPANSION: SectionVisibility = {
  todo: true,
  subagents: false,
  skills: false,
  quick_actions: false,
  lsp: false,
  mcp: false,
}

export const SECTION_DEFINITIONS: readonly { name: SidebarSection; label: string }[] = [
  { name: 'todo', label: 'Todo' },
  { name: 'subagents', label: 'Subagents' },
  { name: 'skills', label: 'Skills' },
  { name: 'quick_actions', label: 'Quick actions' },
  { name: 'lsp', label: 'LSP' },
  { name: 'mcp', label: 'MCP' },
]

export const QUICK_ACTIONS = [
  { icon: quickActionIcon('session.rename'), label: 'Rename', command: 'session.rename' },
  { icon: quickActionIcon('session.timeline'), label: 'Timeline', command: 'session.timeline' },
  { icon: quickActionIcon('session.copy'), label: 'Copy transcript', command: 'session.copy' },
  { icon: quickActionIcon('session.export'), label: 'Export', command: 'session.export' },
  { icon: quickActionIcon('session.compact'), label: 'Compact', command: 'session.compact' },
] as const
