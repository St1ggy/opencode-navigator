import { hostCapabilities } from '../../../shared/lib/host-capabilities'

import type { UiIcon } from '../../../shared/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

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
      {
        icon: 'todo',
        title: 'Todo filters',
        description: 'Track active, finished, and cancelled tasks. Edit through chat and the built-in Todo tool.',
      },
      {
        icon: 'subagents',
        title: 'Live subagents',
        description: 'See running, retrying, recent, and failed child sessions; open them directly.',
      },
      {
        icon: 'info',
        title: 'Provider limits',
        description:
          'Follow the selected provider and account allowance. Codex linking and banked resets require confirmation.',
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
    summary:
      'Keep frequent commands and private toolbar shortcuts nearby; show only host-supported language-server status.',
    icon: 'actions',
    features: [
      {
        icon: 'actions',
        title: 'Quick Actions',
        description:
          'Choose visibility and order for rename, timeline, copy, export, compaction and other available commands.',
      },
      {
        icon: 'lsp',
        title: 'Compact LSP status',
        description: 'Spot connected and failed language servers at a glance.',
      },
      {
        icon: 'settings',
        title: 'Private pinned toolbar',
        description:
          'Pin Actions or Skills separately from favorites: zero to three icons, optional text, observed-state icons, More or wrapping.',
      },
      {
        icon: 'settings',
        title: 'Session permissions',
        description: 'Toggle auto-approve with the supported OpenCode 1.x command.',
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
        description:
          'Activate a group heading to connect or disconnect its full eligible bucket; retry failures in place.',
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
      {
        icon: 'presets',
        title: 'Scoped presets',
        description: 'Preview layouts globally or for a worktree. Reload private preferences across running sessions.',
      },
      {
        icon: 'settings',
        title: 'About and changelog',
        description:
          'Check versions and updates, reopen notes by version, and prepare an editable Bug report for gh or your browser.',
      },
      {
        icon: 'info',
        title: 'Readable controls',
        description:
          'Use Nerd Font icons with the corner font, disable multiline masks, or choose Text fallback. Open Settings with Ctrl+,.',
      },
    ],
  },
]

export function onboardingSteps(api: TuiPluginApi): readonly OnboardingStep[] {
  const capabilities = hostCapabilities(api)

  return ONBOARDING_STEPS.map((step, index) => {
    if (index === 1 && capabilities.nativeTodo)
      return {
        ...step,
        features: [
          {
            icon: 'todo',
            title: 'Todo filters and enablement',
            description:
              'If native Todo is off, use Enable Todo and confirm its server-config change. Edit tasks through chat and todowrite.',
          },
          ...step.features.slice(1),
        ],
      }

    if (index === 3)
      return {
        ...step,
        features: step.features.map((feature) => {
          if (feature.icon === 'lsp' && !capabilities.lsp)
            return {
              ...feature,
              title: 'Language tools on this host',
              description:
                'OpenCode 2.x does not expose LSP status or actions. Use project lint and compiler commands instead.',
            }

          if (feature.title === 'Session permissions' && capabilities.permissionMode === false)
            return {
              ...feature,
              description: 'The Permissions action opens host Settings; choose Session → Permissions there.',
            }

          return feature
        }),
      }

    return step
  })
}
