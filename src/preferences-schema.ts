import { SIDEBAR_SECTIONS, type SectionVisibility, type SidebarSection } from "./state"

export type PluginSettings = {
  toggleKey: string
  focusKey: string
  persistMcp: boolean
  lspIconStyle: "nerd" | "text"
}

export type SectionLayoutDefault = {
  sections: Partial<SectionVisibility>
  expanded: Partial<SectionVisibility>
  order?: SidebarSection[]
}

export type DesiredMcpState = "enabled" | "disabled"
export type DesiredMcpStates = Record<string, DesiredMcpState>
export type LayoutPresets = Record<string, SectionLayoutDefault>
export type McpPresets = Record<string, DesiredMcpStates>

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
    favoriteSkills?: string[]
  }
}

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
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  return value as Record<string, unknown>
}

export function parseSectionPreferences(value: unknown): Partial<SectionVisibility> {
  const input = record(value)
  if (!input) return {}
  return Object.fromEntries(
    SIDEBAR_SECTIONS.flatMap((name) => (typeof input[name] === "boolean" ? [[name, input[name]]] : [])),
  ) as Partial<SectionVisibility>
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

export function parsePluginSettings(value: unknown): Partial<PluginSettings> {
  const input = record(value)
  if (!input) return {}
  return {
    ...(typeof input.toggleKey === "string" && input.toggleKey.trim() ? { toggleKey: input.toggleKey.trim() } : {}),
    ...(typeof input.focusKey === "string" && input.focusKey.trim() ? { focusKey: input.focusKey.trim() } : {}),
    ...(typeof input.persistMcp === "boolean" ? { persistMcp: input.persistMcp } : {}),
    ...(input.lspIconStyle === "nerd" || input.lspIconStyle === "text" ? { lspIconStyle: input.lspIconStyle } : {}),
  }
}

export function parseSectionLayout(value: unknown): SectionLayoutDefault | undefined {
  const input = record(value)
  if (!input) return
  const sections = parseSectionPreferences(input.sections)
  const expanded = parseSectionPreferences(input.expanded)
  const order = parseSectionOrder(input.order)
  if (Object.keys(sections).length === 0 && Object.keys(expanded).length === 0 && !order) return
  return { sections, expanded, ...(order ? { order } : {}) }
}

export function parseLayoutPresets(value: unknown): LayoutPresets {
  const input = record(value)
  if (!input) return {}
  const presets: LayoutPresets = {}
  for (const [candidate, value] of Object.entries(input).sort(([left], [right]) => left.localeCompare(right))) {
    const name = candidate.trim().slice(0, 64)
    const layout = parseSectionLayout(value)
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
          Boolean(entry[0]) && (entry[1] === "enabled" || entry[1] === "disabled"),
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  )
}

export function parseMcpPresets(value: unknown): McpPresets {
  const input = record(value)
  if (!input) return {}
  const presets: McpPresets = {}
  const names = new Set<string>()
  for (const [candidate, value] of Object.entries(input).sort(([left], [right]) => left.localeCompare(right))) {
    const name = candidate.trim().slice(0, 64)
    const states = parseDesiredMcpStates(value)
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
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))].sort()
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
  if (!input) throw new Error("Invalid preferences document")

  const globalInput = record(input.global)
  const behavior = parsePluginSettings(globalInput?.behavior)
  const layout = parseSectionLayout(globalInput?.layout)
  const globalMcp = parseDesiredMcpStates(globalInput?.mcp)
  const worktreesInput = record(input.worktrees)
  const worktrees: PreferencesDocument["worktrees"] = {}
  for (const [scope, candidate] of Object.entries(worktreesInput ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (!scope) continue
    const candidateInput = record(candidate)
    const scopedBehavior = parsePluginSettings(candidateInput?.behavior)
    const scopedLayout = parseSectionLayout(candidateInput?.layout)
    const mcp = parseDesiredMcpStates(candidateInput?.mcp)
    if (Object.keys(scopedBehavior).length > 0 || scopedLayout || Object.keys(mcp).length > 0) {
      worktrees[scope] = {
        ...(Object.keys(scopedBehavior).length > 0 ? { behavior: scopedBehavior } : {}),
        ...(scopedLayout ? { layout: scopedLayout } : {}),
        ...(Object.keys(mcp).length > 0 ? { mcp } : {}),
      }
    }
  }
  const userInput = record(input.user)
  const skippedSkillConfirmations = parseStringList(userInput?.skippedSkillConfirmations)
  const layoutPresets = parseLayoutPresets(userInput?.layoutPresets)
  const mcpPresets = parseMcpPresets(userInput?.mcpPresets)
  const favoriteSkills = parseStringList(userInput?.favoriteSkills)

  return {
    global: {
      ...(Object.keys(behavior).length > 0 ? { behavior } : {}),
      ...(layout ? { layout } : {}),
      ...(Object.keys(globalMcp).length > 0 ? { mcp: globalMcp } : {}),
    },
    worktrees,
    user: {
      ...(skippedSkillConfirmations ? { skippedSkillConfirmations } : {}),
      ...(typeof userInput?.onboardingCompleted === "boolean"
        ? { onboardingCompleted: userInput.onboardingCompleted }
        : {}),
      ...(Object.keys(layoutPresets).length > 0 ? { layoutPresets } : {}),
      ...(Object.keys(mcpPresets).length > 0 ? { mcpPresets } : {}),
      ...(favoriteSkills ? { favoriteSkills } : {}),
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
      ...(parseSectionOrder(value.layout?.order) ? { order: parseSectionOrder(value.layout?.order) } : {}),
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
    Object.assign(behavior, layer.behavior)
    Object.assign(sections, layer.layout?.sections)
    Object.assign(expanded, layer.layout?.expanded)
    if (layer.layout?.order?.length) order = [...layer.layout.order]
    Object.assign(desiredMcpStates, layer.desiredMcpStates)
  }
  return { behavior, layout: { sections, expanded, order }, desiredMcpStates }
}

export function preferencesScope(path: { worktree?: string; directory?: string }) {
  return path.worktree || path.directory || "global"
}
