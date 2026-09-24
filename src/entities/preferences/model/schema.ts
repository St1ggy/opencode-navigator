import {
  type DesiredMcpState,
  type DesiredMcpStates,
  type LayoutPresets,
  type McpPresets,
  type McpServerGroups,
  type PluginSettings,
  QUICK_ACTION_IDS,
  type QuickActionId,
  type SectionLayoutDefault,
  type SectionVisibility,
  type SidebarSection,
  parseQuickActionOrder,
  parseQuickActionVisibility,
  parseSectionItemLimits,
  parseSectionLayout,
  parseSectionOrder,
  parseSectionPreferences,
} from '../../../shared/config'

export type {
  DesiredMcpState,
  DesiredMcpStates,
  LayoutPresets,
  McpPresets,
  McpServerGroups,
  PluginSettings,
  QuickActionId,
  QuickActionVisibility,
  SectionItemLimits,
  SectionLayoutDefault,
  SectionVisibility,
  SidebarRowDensity,
  SidebarSection,
} from '../../../shared/config'

export {
  parseSectionItemLimits,
  parseSectionLayout,
  parseSectionOrder,
  parseSectionPreferences,
  preferencesScope,
} from '../../../shared/config'

export type PreferenceValues = {
  behavior?: Partial<PluginSettings>
  layout?: Partial<SectionLayoutDefault>
  desiredMcpStates?: DesiredMcpStates
}

export type PreferencesDocument = {
  global: ScopedPreferences
  worktrees: Record<string, ScopedPreferences>
  user: {
    skippedSkillConfirmations?: string[]
    onboardingCompleted?: boolean
    layoutPresets?: LayoutPresets
    mcpPresets?: McpPresets
    workspaceProfiles?: WorkspaceProfiles
    favoriteSkills?: string[]
    favoriteMcpServers?: string[]
    favoriteQuickActions?: QuickActionId[]
    recentSkills?: string[]
    recentQuickActions?: QuickActionId[]
    mcpServerGroups?: McpServerGroups
  }
}
export type WorkspaceProfiles = Record<string, string>

export type ResolvedPreferences = {
  behavior: PluginSettings
  layout: {
    sections: SectionVisibility
    expanded: SectionVisibility
    order: SidebarSection[]
  }
  desiredMcpStates: DesiredMcpStates
}

export type ScopedPreferences = {
  behavior?: Partial<PluginSettings>
  layout?: SectionLayoutDefault
  mcp?: DesiredMcpStates
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return

  return value as Record<string, unknown>
}

export function parsePluginSettings(value: unknown): Partial<PluginSettings> {
  const input = record(value)

  if (!input) return {}

  return {
    ...(typeof input.toggleKey === 'string' && input.toggleKey.trim() && { toggleKey: input.toggleKey.trim() }),
    ...(typeof input.focusKey === 'string' && input.focusKey.trim() && { focusKey: input.focusKey.trim() }),
    ...(typeof input.searchKey === 'string' && input.searchKey.trim() && { searchKey: input.searchKey.trim() }),
    ...(typeof input.persistMcp === 'boolean' && { persistMcp: input.persistMcp }),
    ...(typeof input.cornerFont === 'boolean' && { cornerFont: input.cornerFont }),
    ...((input.lspIconStyle === 'nerd' || input.lspIconStyle === 'text') && { lspIconStyle: input.lspIconStyle }),
    ...((input.rowDensity === 'compact' || input.rowDensity === 'comfortable') && {
      rowDensity: input.rowDensity,
    }),
    ...(Object.keys(parseSectionItemLimits(input.sectionItemLimits)).length > 0 && {
      sectionItemLimits: parseSectionItemLimits(input.sectionItemLimits),
    }),
    ...(parseQuickActionOrder(input.quickActionOrder) && {
      quickActionOrder: parseQuickActionOrder(input.quickActionOrder),
    }),
    ...(Object.keys(parseQuickActionVisibility(input.quickActionVisibility)).length > 0 && {
      quickActionVisibility: parseQuickActionVisibility(input.quickActionVisibility),
    }),
  }
}

export function parseLayoutPresets(value: unknown): LayoutPresets {
  const input = record(value)

  if (!input) return {}

  const presets: LayoutPresets = {}
  const entries = Object.entries(input).sort(([left], [right]) => left.localeCompare(right))

  for (const [candidate, preset] of entries) {
    const name = candidate.trim().slice(0, 64)
    const layout = parseSectionLayout(preset)

    if (name && layout && Object.keys(presets).length < 50) presets[name] = layout
  }

  return presets
}

export function parseDesiredMcpStates(value: unknown): DesiredMcpStates {
  const input = record(value)

  if (!input) return {}

  return Object.fromEntries(
    Object.entries(input)
      .filter(
        (entry): entry is [string, DesiredMcpState] =>
          Boolean(entry[0]) && (entry[1] === 'enabled' || entry[1] === 'disabled'),
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  )
}

export function parseMcpPresets(value: unknown): McpPresets {
  const input = record(value)

  if (!input) return {}

  const presets: McpPresets = {}
  const names = new Set<string>()
  const entries = Object.entries(input).sort(([left], [right]) => left.localeCompare(right))

  for (const [candidate, preset] of entries) {
    const name = candidate.trim().slice(0, 64)
    const states = parseDesiredMcpStates(preset)
    const key = name.toLocaleLowerCase()

    if (name && !names.has(key) && Object.keys(states).length > 0 && Object.keys(presets).length < 50) {
      names.add(key)
      presets[name] = states
    }
  }

  return presets
}

function parseStringList(value: unknown) {
  if (!Array.isArray(value)) return

  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))].sort()
}

function parseRecentItems<T extends string>(value: unknown, accepts: (item: string) => item is T): T[] {
  if (!Array.isArray(value)) return []

  return [
    ...new Set(value.filter((item): item is T => typeof item === 'string' && item.length > 0 && accepts(item))),
  ].slice(0, 10)
}

export function parseRecentSkills(value: unknown): string[] {
  return parseRecentItems(value, (item): item is string => Boolean(item))
}

export function parseRecentQuickActions(value: unknown): QuickActionId[] {
  return parseRecentItems(value, (item): item is QuickActionId => QUICK_ACTION_IDS.includes(item as QuickActionId))
}

export function parseFavoriteQuickActions(value: unknown): QuickActionId[] {
  if (!Array.isArray(value)) return []

  const selected = new Set(
    value.filter((item): item is QuickActionId => QUICK_ACTION_IDS.includes(item as QuickActionId)),
  )

  return QUICK_ACTION_IDS.filter((id) => selected.has(id))
}

export function parseMcpServerGroups(value: unknown): McpServerGroups {
  const input = record(value)

  if (!input) return {}

  return Object.fromEntries(
    Object.entries(input).flatMap(([server, rawGroup]) => {
      const group = typeof rawGroup === 'string' ? rawGroup.trim().slice(0, 64) : ''

      return server.trim() && group ? [[server, group]] : []
    }),
  )
}

export function parseWorkspaceProfiles(value: unknown): WorkspaceProfiles {
  return Object.fromEntries(
    Object.entries(record(value) ?? {})
      .flatMap(([layout, rawMcp]) => {
        const layoutName = layout.trim().slice(0, 64)
        const mcpName = typeof rawMcp === 'string' ? rawMcp.trim().slice(0, 64) : ''

        return layoutName && mcpName ? [[layoutName, mcpName]] : []
      })
      .slice(0, 50),
  )
}

export function emptyPreferencesDocument(): PreferencesDocument {
  return {
    global: {},
    worktrees: {},
    user: {},
  }
}

export function parsePreferencesDocument(value: unknown): PreferencesDocument {
  const input = record(value)

  if (!input) throw new Error('Invalid preferences document')

  const globalInput = record(input.global)
  const behavior = parsePluginSettings(globalInput?.behavior)
  const layout = parseSectionLayout(globalInput?.layout)
  const globalMcp = parseDesiredMcpStates(globalInput?.mcp)
  const worktreesInput = record(input.worktrees)
  const worktrees: PreferencesDocument['worktrees'] = {}
  const entries = Object.entries(worktreesInput ?? {}).sort(([left], [right]) => left.localeCompare(right))

  for (const [scope, candidate] of entries) {
    if (!scope) continue

    const candidateInput = record(candidate)
    const scopedBehavior = parsePluginSettings(candidateInput?.behavior)
    const scopedLayout = parseSectionLayout(candidateInput?.layout)
    const mcp = parseDesiredMcpStates(candidateInput?.mcp)

    if (Object.keys(scopedBehavior).length > 0 || scopedLayout || Object.keys(mcp).length > 0) {
      worktrees[scope] = {
        ...(Object.keys(scopedBehavior).length > 0 && { behavior: scopedBehavior }),
        ...(scopedLayout && { layout: scopedLayout }),
        ...(Object.keys(mcp).length > 0 && { mcp }),
      }
    }
  }
  const userInput = record(input.user)
  const skippedSkillConfirmations = parseStringList(userInput?.skippedSkillConfirmations)
  const layoutPresets = parseLayoutPresets(userInput?.layoutPresets)
  const mcpPresets = parseMcpPresets(userInput?.mcpPresets)
  const favoriteSkills = parseStringList(userInput?.favoriteSkills)
  const favoriteMcpServers = parseStringList(userInput?.favoriteMcpServers)
  const favoriteQuickActions = parseFavoriteQuickActions(userInput?.favoriteQuickActions)
  const recentSkills = parseRecentSkills(userInput?.recentSkills)
  const recentQuickActions = parseRecentQuickActions(userInput?.recentQuickActions)
  const mcpServerGroups = parseMcpServerGroups(userInput?.mcpServerGroups)
  const workspaceProfiles = parseWorkspaceProfiles(userInput?.workspaceProfiles)

  return {
    global: {
      ...(Object.keys(behavior).length > 0 && { behavior }),
      ...(layout && { layout }),
      ...(Object.keys(globalMcp).length > 0 && { mcp: globalMcp }),
    },
    worktrees,
    user: {
      ...(skippedSkillConfirmations && { skippedSkillConfirmations }),
      ...(typeof userInput?.onboardingCompleted === 'boolean' && {
        onboardingCompleted: userInput.onboardingCompleted,
      }),
      ...(Object.keys(layoutPresets).length > 0 && { layoutPresets }),
      ...(Object.keys(mcpPresets).length > 0 && { mcpPresets }),
      ...(favoriteSkills && { favoriteSkills }),
      ...(favoriteMcpServers?.length && { favoriteMcpServers }),
      ...(favoriteQuickActions.length > 0 && { favoriteQuickActions }),
      ...(recentSkills.length > 0 && { recentSkills }),
      ...(recentQuickActions.length > 0 && { recentQuickActions }),
      ...(Object.keys(mcpServerGroups).length > 0 && { mcpServerGroups }),
      ...(Object.keys(workspaceProfiles).length > 0 && { workspaceProfiles }),
    },
  }
}

function parseValues(value: PreferenceValues | undefined): PreferenceValues {
  if (!value) return {}

  return {
    behavior: parsePluginSettings(value.behavior),
    layout: {
      sections: parseSectionPreferences(value.layout?.sections),
      expanded: parseSectionPreferences(value.layout?.expanded),
      ...(parseSectionOrder(value.layout?.order) && { order: parseSectionOrder(value.layout?.order) }),
    },
    desiredMcpStates: parseDesiredMcpStates(value.desiredMcpStates),
  }
}

export function resolvePreferences(input: {
  builtIns: ResolvedPreferences
  pluginOptions?: PreferenceValues
  global?: PreferenceValues
  worktree?: PreferenceValues
  session?: PreferenceValues
}): ResolvedPreferences {
  const layers = [
    parseValues(input.pluginOptions),
    parseValues(input.global),
    parseValues(input.worktree),
    parseValues(input.session),
  ]
  const behavior = { ...input.builtIns.behavior }
  const sections = { ...input.builtIns.layout.sections }
  const expanded = { ...input.builtIns.layout.expanded }
  let order = [...input.builtIns.layout.order]
  const desiredMcpStates = { ...input.builtIns.desiredMcpStates }

  for (const layer of layers) {
    const sectionItemLimits = { ...behavior.sectionItemLimits, ...layer.behavior?.sectionItemLimits }
    const quickActionVisibility = { ...behavior.quickActionVisibility, ...layer.behavior?.quickActionVisibility }

    Object.assign(behavior, layer.behavior)
    behavior.sectionItemLimits = sectionItemLimits
    behavior.quickActionVisibility = quickActionVisibility
    Object.assign(sections, layer.layout?.sections)
    Object.assign(expanded, layer.layout?.expanded)

    if (layer.layout?.order?.length) order = [...layer.layout.order]

    Object.assign(desiredMcpStates, layer.desiredMcpStates)
  }

  return { behavior, layout: { sections, expanded, order }, desiredMcpStates }
}
