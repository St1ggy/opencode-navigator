export const MCP_PREFERENCES_KEY = "opencode-pretty-sidebar.mcp-preferences"

export const SIDEBAR_SECTIONS = ["todo", "subagents", "skills", "quick_actions", "lsp", "mcp"] as const

export type SidebarSection = (typeof SIDEBAR_SECTIONS)[number]
export type SectionVisibility = Record<SidebarSection, boolean>

export function resolveSectionVisibility(defaults: SectionVisibility, value: unknown): SectionVisibility {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults

  const input = value as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(defaults).map(([name, visible]) => [name, typeof input[name] === "boolean" ? input[name] : visible]),
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

export type McpPreferences = {
  version: 2
  disabledByScope: Record<string, string[]>
  enabledByScope: Record<string, string[]>
}

export function mcpScope(path: { worktree?: string; directory?: string }) {
  return path.worktree || path.directory || "global"
}

function parseMcpStatesByScope(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  const result: Record<string, string[]> = {}
  for (const [scope, names] of Object.entries(value)) {
    if (!Array.isArray(names)) continue
    const valid = [
      ...new Set(names.filter((name): name is string => typeof name === "string" && name.length > 0)),
    ].sort()
    if (valid.length > 0) result[scope] = valid
  }
  return result
}

export function parseMcpPreferences(value: unknown): McpPreferences {
  const empty: McpPreferences = { version: 2, disabledByScope: {}, enabledByScope: {} }
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty

  const input = value as Record<string, unknown>
  if (input.version !== 1 && input.version !== 2) return empty

  const disabledByScope = parseMcpStatesByScope(input.disabledByScope)
  const enabledByScope = input.version === 2 ? parseMcpStatesByScope(input.enabledByScope) : {}
  for (const [scope, names] of Object.entries(enabledByScope)) {
    const disabled = new Set(disabledByScope[scope] ?? [])
    const enabled = names.filter((name) => !disabled.has(name))
    if (enabled.length > 0) enabledByScope[scope] = enabled
    else delete enabledByScope[scope]
  }

  return { version: 2, disabledByScope, enabledByScope }
}

export function disabledMcpNames(value: unknown, scope: string) {
  return new Set(parseMcpPreferences(value).disabledByScope[scope] ?? [])
}

export function enabledMcpNames(value: unknown, scope: string) {
  return new Set(parseMcpPreferences(value).enabledByScope[scope] ?? [])
}

export function setMcpDisabled(value: unknown, scope: string, name: string, disabled: boolean): McpPreferences {
  const current = parseMcpPreferences(value)
  const disabledNames = new Set(current.disabledByScope[scope] ?? [])
  const enabledNames = new Set(current.enabledByScope[scope] ?? [])

  const add = disabled ? disabledNames : enabledNames
  const remove = disabled ? enabledNames : disabledNames
  add.add(name)
  remove.delete(name)

  const disabledByScope = { ...current.disabledByScope }
  if (disabledNames.size > 0) disabledByScope[scope] = [...disabledNames].sort()
  else delete disabledByScope[scope]

  const enabledByScope = { ...current.enabledByScope }
  if (enabledNames.size > 0) enabledByScope[scope] = [...enabledNames].sort()
  else delete enabledByScope[scope]

  return { version: 2, disabledByScope, enabledByScope }
}

export function mcpToggleAction(status: string): "connect" | "disconnect" | undefined {
  if (status === "pending") return
  return status === "connected" ? "disconnect" : "connect"
}
