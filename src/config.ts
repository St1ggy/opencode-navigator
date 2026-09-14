import type { PluginSettings } from "./preferences-schema"
import { parseSectionVisibility, type SectionVisibility } from "./state"

export type PluginConfig = PluginSettings & {
  sections: SectionVisibility
}

export function pluginConfig(options: Record<string, unknown> | undefined): PluginConfig {
  return {
    toggleKey:
      typeof options?.toggle_key === "string" && options.toggle_key.trim() ? options.toggle_key.trim() : "ctrl+shift+b",
    focusKey:
      typeof options?.focus_key === "string" && options.focus_key.trim() ? options.focus_key.trim() : "ctrl+shift+f",
    persistMcp: options?.persist_mcp !== false,
    sections: parseSectionVisibility(options?.sections),
    lspIconStyle: options?.lsp_icon_style === "text" ? "text" : "nerd",
  }
}
