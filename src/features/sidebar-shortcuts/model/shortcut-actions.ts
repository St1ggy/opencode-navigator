import { PLUGIN_ID } from '../../../shared/config'
import { supportsSidebarSection } from '../../../shared/lib/host-capabilities'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const ACTIONS = [
  {
    key: 'h',
    label: 'Toggle sidebar',
    icon: 'sections',
    group: 'navigate',
    command: 'session.sidebar.toggle',
    section: undefined,
  },
  { key: 't', label: 'Todo', icon: 'todo', group: 'navigate', command: `${PLUGIN_ID}.focus.todo`, section: 'todo' },
  {
    key: 'a',
    label: 'Subagents',
    icon: 'subagents',
    group: 'navigate',
    command: `${PLUGIN_ID}.focus.subagents`,
    section: 'subagents',
  },
  {
    key: 's',
    label: 'Skills',
    icon: 'skills',
    group: 'navigate',
    command: `${PLUGIN_ID}.focus.skills`,
    section: 'skills',
  },
  {
    key: 'q',
    label: 'Quick actions',
    icon: 'actions',
    group: 'navigate',
    command: `${PLUGIN_ID}.focus.quick_actions`,
    section: 'quick_actions',
  },
  { key: 'l', label: 'LSP', icon: 'lsp', group: 'navigate', command: `${PLUGIN_ID}.focus.lsp`, section: 'lsp' },
  { key: 'm', label: 'MCP', icon: 'mcp', group: 'navigate', command: `${PLUGIN_ID}.focus.mcp`, section: 'mcp' },
  {
    key: 'c',
    label: 'Check update',
    icon: 'search',
    group: 'updates',
    command: `${PLUGIN_ID}.check-update`,
    section: undefined,
  },
  {
    key: 'u',
    label: 'Update Navigator',
    icon: 'update',
    group: 'updates',
    command: `${PLUGIN_ID}.update-navigator`,
    section: undefined,
  },
] as const

export type SidebarShortcutAction = (typeof ACTIONS)[number]

export function sidebarShortcutActions(api: TuiPluginApi): readonly SidebarShortcutAction[] {
  return ACTIONS.filter(({ section }) => !section || supportsSidebarSection(api, section))
}
