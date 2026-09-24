export const SIDEBAR_SECTIONS = ['todo', 'subagents', 'skills', 'quick_actions', 'lsp', 'mcp'] as const

export type SidebarSection = (typeof SIDEBAR_SECTIONS)[number]
export type SectionVisibility = Record<SidebarSection, boolean>
export type SectionItemLimits = Partial<Record<SidebarSection, number>>
export type SidebarRowDensity = 'compact' | 'comfortable'

export const QUICK_ACTION_IDS = [
  'session.rename',
  'session.timeline',
  'session.copy',
  'session.export',
  'session.compact',
  'session.list',
  'session.new',
  'session.fork',
  'messages.copy',
  'session.first',
  'session.last',
  'session.messages_last_user',
  'session.message.next',
  'session.message.previous',
  'permission.mode',
] as const

export type QuickActionId = (typeof QUICK_ACTION_IDS)[number]
export type QuickActionVisibility = Partial<Record<QuickActionId, boolean>>

export type PluginSettings = {
  toggleKey: string
  focusKey: string
  searchKey: string
  persistMcp: boolean
  cornerFont: boolean
  // Legacy persisted key; the style now controls every Navigator icon.
  lspIconStyle: 'nerd' | 'text'
  rowDensity: SidebarRowDensity
  sectionItemLimits: SectionItemLimits
  quickActionOrder: QuickActionId[]
  quickActionVisibility: QuickActionVisibility
}

export type SectionLayoutDefault = {
  sections: Partial<SectionVisibility>
  expanded: Partial<SectionVisibility>
  order?: SidebarSection[]
}

export type DesiredMcpState = 'enabled' | 'disabled'
export type DesiredMcpStates = Record<string, DesiredMcpState>
export type LayoutPresets = Record<string, SectionLayoutDefault>
export type McpPresets = Record<string, DesiredMcpStates>
export type McpServerGroups = Record<string, string>

export function preferencesScope(path: { worktree?: string; directory?: string }) {
  return path.worktree || path.directory || 'global'
}

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

export function parseQuickActionOrder(value: unknown): QuickActionId[] | undefined {
  if (!Array.isArray(value)) return

  const order = [...new Set(value.filter((id): id is QuickActionId => QUICK_ACTION_IDS.includes(id)))]

  return [...order, ...QUICK_ACTION_IDS.filter((id) => !order.includes(id))]
}

export function parseQuickActionVisibility(value: unknown): QuickActionVisibility {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const input = value as Record<string, unknown>

  return Object.fromEntries(QUICK_ACTION_IDS.flatMap((id) => (typeof input[id] === 'boolean' ? [[id, input[id]]] : [])))
}

export function parseSectionOrder(value: unknown): SidebarSection[] | undefined {
  if (!Array.isArray(value)) return

  const seen = new Set<SidebarSection>()
  const order: SidebarSection[] = []

  for (const candidate of value) {
    if (!SIDEBAR_SECTIONS.includes(candidate as SidebarSection) || seen.has(candidate as SidebarSection)) continue

    seen.add(candidate as SidebarSection)
    order.push(candidate as SidebarSection)
  }
  for (const section of SIDEBAR_SECTIONS) {
    if (!seen.has(section)) order.push(section)
  }

  return order
}

export function parseSectionPreferences(value: unknown): Partial<SectionVisibility> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const input = value as Record<string, unknown>

  return Object.fromEntries(
    SIDEBAR_SECTIONS.flatMap((name) => (typeof input[name] === 'boolean' ? [[name, input[name]]] : [])),
  ) as Partial<SectionVisibility>
}

export function parseSectionLayout(value: unknown): SectionLayoutDefault | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return

  const input = value as Record<string, unknown>
  const sections = parseSectionPreferences(input.sections)
  const expanded = parseSectionPreferences(input.expanded)
  const order = parseSectionOrder(input.order)

  if (Object.keys(sections).length === 0 && Object.keys(expanded).length === 0 && !order) return

  return { sections, expanded, ...(order && { order }) }
}

export function parseSectionItemLimits(value: unknown): SectionItemLimits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const input = value as Record<string, unknown>

  return Object.fromEntries(
    SIDEBAR_SECTIONS.flatMap((section) => {
      const limit = input[section]

      return typeof limit === 'number' && Number.isSafeInteger(limit) && limit >= 0 ? [[section, limit]] : []
    }),
  )
}

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
