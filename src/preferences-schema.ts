import { SIDEBAR_SECTIONS, type SectionVisibility } from "./state"

export type PluginSettings = {
  toggleKey: string
  focusKey: string
  persistMcp: boolean
  lspIconStyle: "nerd" | "text"
}

export type SectionLayoutDefault = {
  sections: Partial<SectionVisibility>
  expanded: Partial<SectionVisibility>
}

export type DesiredMcpState = "enabled" | "disabled"
export type DesiredMcpStates = Record<string, DesiredMcpState>

export type PreferenceValues = {
  behavior?: Partial<PluginSettings>
  layout?: Partial<SectionLayoutDefault>
  desiredMcpStates?: DesiredMcpStates
}

export type PreferencesDocument = {
  global: {
    behavior?: Partial<PluginSettings>
    layout?: SectionLayoutDefault
  }
  worktrees: Record<string, { mcp: DesiredMcpStates }>
  user: {
    skippedSkillConfirmations?: string[]
    onboardingCompleted?: boolean
  }
}

export type ResolvedPreferences = {
  behavior: PluginSettings
  layout: {
    sections: SectionVisibility
    expanded: SectionVisibility
  }
  desiredMcpStates: DesiredMcpStates
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
  if (Object.keys(sections).length === 0 && Object.keys(expanded).length === 0) return
  return { sections, expanded }
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
  const worktreesInput = record(input.worktrees)
  const worktrees: PreferencesDocument["worktrees"] = {}
  for (const [scope, candidate] of Object.entries(worktreesInput ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (!scope) continue
    const mcp = parseDesiredMcpStates(record(candidate)?.mcp)
    if (Object.keys(mcp).length > 0) worktrees[scope] = { mcp }
  }
  const userInput = record(input.user)
  const skippedSkillConfirmations = parseStringList(userInput?.skippedSkillConfirmations)

  return {
    global: {
      ...(Object.keys(behavior).length > 0 ? { behavior } : {}),
      ...(layout ? { layout } : {}),
    },
    worktrees,
    user: {
      ...(skippedSkillConfirmations ? { skippedSkillConfirmations } : {}),
      ...(typeof userInput?.onboardingCompleted === "boolean"
        ? { onboardingCompleted: userInput.onboardingCompleted }
        : {}),
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
  const desiredMcpStates = { ...input.builtIns.desiredMcpStates }

  for (const layer of layers) {
    Object.assign(behavior, layer.behavior)
    Object.assign(sections, layer.layout?.sections)
    Object.assign(expanded, layer.layout?.expanded)
    Object.assign(desiredMcpStates, layer.desiredMcpStates)
  }
  return { behavior, layout: { sections, expanded }, desiredMcpStates }
}

export function preferencesScope(path: { worktree?: string; directory?: string }) {
  return path.worktree || path.directory || "global"
}
