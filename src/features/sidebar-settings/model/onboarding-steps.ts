import type { UiIcon } from '../../../shared/ui'

export type OnboardingStep = {
  title: string
  summary: string
  icon: UiIcon
  features: readonly { icon: UiIcon; title: string; description: string }[]
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    title: 'A control center that stays compact',
    summary: "Navigator brings session state, search, and controls into OpenCode's existing sidebar.",
    icon: 'help',
    features: [
      { icon: 'sections', title: 'Progressive disclosure', description: 'Expand only the context you need right now.' },
      { icon: 'scope', title: 'Current context', description: 'Follow the active session, workspace, and worktree.' },
      { icon: 'actions', title: 'Mouse and keyboard', description: 'Use the same controls with either input method.' },
    ],
  },
  {
    title: 'Stay oriented while agents work',
    summary: 'Keep current work visible without turning the sidebar into another dashboard.',
    icon: 'todo',
    features: [
      { icon: 'todo', title: 'Todo filters', description: 'Separate active, finished, and cancelled work.' },
      {
        icon: 'subagents',
        title: 'Live subagents',
        description: 'See running, retrying, recent, and failed child sessions.',
      },
      {
        icon: 'history',
        title: 'Direct navigation',
        description: 'Open a child session without leaving your workflow.',
      },
    ],
  },
  {
    title: 'Find anything and launch Skills safely',
    summary: 'Search complete source lists without expanding every sidebar section.',
    icon: 'search',
    features: [
      {
        icon: 'search',
        title: 'Search Everything',
        description: 'Search Skills, Subagents, MCP, and Actions in shared tabs.',
      },
      { icon: 'search', title: 'Full source lists', description: 'Search beyond sidebar visibility and item limits.' },
      {
        icon: 'skills',
        title: 'Skill confirmation',
        description: 'Review a skill and its source before inserting its command.',
      },
    ],
  },
  {
    title: 'Run actions and check language tools',
    summary: 'Keep frequent OpenCode commands and LSP health within one compact section.',
    icon: 'actions',
    features: [
      {
        icon: 'actions',
        title: 'Quick Actions',
        description: 'Rename, inspect timelines, copy, export, or compact the session.',
      },
      {
        icon: 'lsp',
        title: 'Compact LSP status',
        description: 'Spot connected and failed language servers at a glance.',
      },
      {
        icon: 'settings',
        title: 'Configurable commands',
        description: 'Choose action visibility, order, and shortcuts.',
      },
    ],
  },
  {
    title: 'Control MCP without losing context',
    summary: 'Manage individual servers or entire working sets directly from Navigator.',
    icon: 'mcp',
    features: [
      { icon: 'mcp', title: 'Live server controls', description: 'Connect, disconnect, filter, and favorite servers.' },
      {
        icon: 'actions',
        title: 'Bulk operations',
        description: 'Change eligible servers together and retry failures.',
      },
      { icon: 'presets', title: 'Safe presets', description: 'Preview connections and disconnections before Apply.' },
    ],
  },
  {
    title: 'Make Navigator fit each workspace',
    summary: 'Use the same controls with mouse or keyboard and keep only the context you need.',
    icon: 'settings',
    features: [
      {
        icon: 'sections',
        title: 'Flexible layout',
        description: 'Choose section visibility, order, expansion, and item limits.',
      },
      { icon: 'presets', title: 'Scoped presets', description: 'Save layouts globally or for the current worktree.' },
      {
        icon: 'settings',
        title: 'Accessible controls',
        description: 'Change shortcuts or use Text fallback without a restart.',
      },
    ],
  },
]
