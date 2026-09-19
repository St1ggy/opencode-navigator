export const SIDEBAR_SECTIONS = ['todo', 'subagents', 'skills', 'quick_actions', 'lsp', 'mcp'] as const

export type SidebarSection = (typeof SIDEBAR_SECTIONS)[number]
export type SectionVisibility = Record<SidebarSection, boolean>

export function resolveSectionVisibility(defaults: SectionVisibility, value: unknown): SectionVisibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults

  const input = value as Record<string, unknown>

  return Object.fromEntries(
    Object.entries(defaults).map(([name, visible]) => [name, typeof input[name] === 'boolean' ? input[name] : visible]),
  ) as SectionVisibility
}

export function parseSectionVisibility(value: unknown): SectionVisibility {
  return resolveSectionVisibility(
    {
      todo: true,
      subagents: true,
      skills: true,
      quick_actions: true,
      lsp: true,
      mcp: true,
    },
    value,
  )
}

export function mcpToggleAction(status: string): 'connect' | 'disconnect' | undefined {
  if (status === 'pending') return

  return status === 'connected' ? 'disconnect' : 'connect'
}
