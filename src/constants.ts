import type { SidebarSection, SectionVisibility } from "./state"

export const PLUGIN_ID = "opencode-pretty-sidebar"
export const TOGGLE_COMMAND = `${PLUGIN_ID}.toggle`
export const FOCUS_COMMAND = `${PLUGIN_ID}.focus`
export const DEFAULT_SECTION_EXPANSION: SectionVisibility = {
  todo: true,
  subagents: false,
  skills: false,
  quick_actions: false,
  lsp: false,
  mcp: false,
}

export const SECTION_DEFINITIONS: ReadonlyArray<{ name: SidebarSection; label: string }> = [
  { name: "todo", label: "Todo" },
  { name: "subagents", label: "Subagents" },
  { name: "skills", label: "Skills" },
  { name: "quick_actions", label: "Quick actions" },
  { name: "lsp", label: "LSP" },
  { name: "mcp", label: "MCP" },
]

export const QUICK_ACTIONS = [
  { icon: "✎", label: "Rename", command: "session.rename" },
  { icon: "≡", label: "Timeline", command: "session.timeline" },
  { icon: "⧉", label: "Copy transcript", command: "session.copy" },
  { icon: "⇧", label: "Export", command: "session.export" },
  { icon: "◫", label: "Compact", command: "session.compact" },
] as const
