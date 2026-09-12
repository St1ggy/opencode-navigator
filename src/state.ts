export const MCP_PREFERENCES_KEY = "opencode-pretty-sidebar.mcp-preferences"

export type McpPreferences = {
  version: 1
  disabledByScope: Record<string, string[]>
}

export function mcpScope(path: { worktree?: string; directory?: string }) {
  return path.worktree || path.directory || "global"
}

export function parseMcpPreferences(value: unknown): McpPreferences {
  const empty: McpPreferences = { version: 1, disabledByScope: {} }
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty

  const input = value as Record<string, unknown>
  if (input.version !== 1 || !input.disabledByScope || typeof input.disabledByScope !== "object") return empty

  const disabledByScope = Object.fromEntries(
    Object.entries(input.disabledByScope as Record<string, unknown>)
      .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
      .map(([scope, names]) => [
        scope,
        [...new Set(names.filter((name): name is string => typeof name === "string" && name.length > 0))].sort(),
      ]),
  )

  return { version: 1, disabledByScope }
}

export function disabledMcpNames(value: unknown, scope: string) {
  return new Set(parseMcpPreferences(value).disabledByScope[scope] ?? [])
}

export function setMcpDisabled(value: unknown, scope: string, name: string, disabled: boolean): McpPreferences {
  const current = parseMcpPreferences(value)
  const names = new Set(current.disabledByScope[scope] ?? [])

  if (disabled) names.add(name)
  else names.delete(name)

  const disabledByScope = { ...current.disabledByScope }
  if (names.size > 0) disabledByScope[scope] = [...names].sort()
  else delete disabledByScope[scope]

  return { version: 1, disabledByScope }
}

export function mcpToggleAction(status: string): "connect" | "disconnect" | undefined {
  if (status === "pending") return
  return status === "connected" ? "disconnect" : "connect"
}
