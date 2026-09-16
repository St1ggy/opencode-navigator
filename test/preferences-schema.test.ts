import { describe, expect, test } from "bun:test"
import {
  parsePreferencesDocument,
  preferencesScope,
  resolvePreferences,
  type PreferencesDocument,
} from "../src/preferences-schema"
import type { SidebarSection } from "../src/state"

const builtIns = {
  behavior: {
    toggleKey: "ctrl+shift+b",
    focusKey: "ctrl+shift+f",
    persistMcp: true,
    lspIconStyle: "nerd" as const,
    sectionItemLimits: {},
  },
  layout: {
    sections: {
      todo: true,
      subagents: true,
      skills: true,
      quick_actions: true,
      lsp: true,
      mcp: true,
    },
    expanded: {
      todo: true,
      subagents: false,
      skills: false,
      quick_actions: false,
      lsp: false,
      mcp: false,
    },
    order: ["todo", "subagents", "skills", "quick_actions", "lsp", "mcp"] as SidebarSection[],
  },
  desiredMcpStates: {},
}

describe("preferences schema", () => {
  test("keys worktree preferences by exact worktree with directory and global fallbacks", () => {
    expect(preferencesScope({ worktree: "/repo", directory: "/repo/packages/app" })).toBe("/repo")
    expect(preferencesScope({ directory: "/tmp/project" })).toBe("/tmp/project")
    expect(preferencesScope({})).toBe("global")
  })

  test("sanitizes every durable leaf and drops unknown data", () => {
    expect(
      parsePreferencesDocument({
        global: {
          behavior: {
            toggleKey: " alt+s ",
            focusKey: " ",
            persistMcp: false,
            lspIconStyle: "invalid",
            unknown: true,
          },
          layout: {
            sections: { todo: false, skills: "no" },
            expanded: { skills: true, unknown: true },
            order: ["mcp", "todo", "mcp", "unknown"],
          },
          mcp: { global: "enabled" },
        },
        worktrees: {
          "/repo": {
            behavior: { focusKey: "alt+w" },
            layout: { sections: { mcp: false }, expanded: {}, order: ["skills", "todo"] },
            mcp: { wiki: "disabled", context7: "enabled", bad: "maybe" },
          },
          invalid: "no",
        },
        user: {
          skippedSkillConfirmations: ["/skills/review", 42, "/skills/review"],
          onboardingCompleted: true,
          layoutPresets: {
            " Focus ": {
              sections: { skills: false, unknown: true },
              expanded: { todo: false },
              order: ["mcp", "todo", "mcp", "unknown"],
            },
            Empty: {},
          },
          mcpPresets: {
            " Work ": { wiki: "disabled", context7: "enabled", bad: "maybe" },
            Empty: {},
          },
          favoriteSkills: ["/skills/review", 42, "/skills/review", "/skills/commit"],
          unknown: true,
        },
        unknown: true,
      }),
    ).toEqual({
      global: {
        behavior: { toggleKey: "alt+s", persistMcp: false },
        layout: {
          sections: { todo: false },
          expanded: { skills: true },
          order: ["mcp", "todo", "subagents", "skills", "quick_actions", "lsp"],
        },
        mcp: { global: "enabled" },
      },
      worktrees: {
        "/repo": {
          behavior: { focusKey: "alt+w" },
          layout: {
            sections: { mcp: false },
            expanded: {},
            order: ["skills", "todo", "subagents", "quick_actions", "lsp", "mcp"],
          },
          mcp: { context7: "enabled", wiki: "disabled" },
        },
      },
      user: {
        skippedSkillConfirmations: ["/skills/review"],
        onboardingCompleted: true,
        layoutPresets: {
          Focus: {
            sections: { skills: false },
            expanded: { todo: false },
            order: ["mcp", "todo", "subagents", "skills", "quick_actions", "lsp"],
          },
        },
        mcpPresets: { Work: { context7: "enabled", wiki: "disabled" } },
        favoriteSkills: ["/skills/commit", "/skills/review"],
      },
    } satisfies PreferencesDocument)
  })

  test("rejects structurally malformed documents", () => {
    expect(() => parsePreferencesDocument([])).toThrow("Invalid preferences document")
    expect(() => parsePreferencesDocument(null)).toThrow("Invalid preferences document")
  })

  test("merges list limits leaf-wise and allows explicit unlimited overrides", () => {
    const result = resolvePreferences({
      builtIns,
      pluginOptions: { behavior: { sectionItemLimits: { todo: 2, skills: 5 } } },
      global: { behavior: { sectionItemLimits: { todo: 3, mcp: 8 } } },
      worktree: { behavior: { sectionItemLimits: { todo: 0 } } },
    })
    expect(result.behavior.sectionItemLimits).toEqual({ todo: 0, skills: 5, mcp: 8 })
    expect(
      parsePreferencesDocument({
        global: { behavior: { sectionItemLimits: { todo: Infinity, skills: NaN, mcp: -1 } } },
      }).global,
    ).toEqual({})
  })

  test("normalizes MCP preset names case-insensitively", () => {
    const presets = parsePreferencesDocument({
      user: { mcpPresets: { Work: { wiki: "enabled" }, work: { wiki: "disabled" } } },
    }).user.mcpPresets
    expect(Object.keys(presets ?? {})).toHaveLength(1)
  })

  test("resolves supported values leaf-wise in session, worktree, global, option, built-in order", () => {
    expect(
      resolvePreferences({
        builtIns,
        pluginOptions: {
          behavior: { toggleKey: "alt+o", focusKey: "alt+f" },
          layout: { sections: { todo: false, lsp: false } },
          desiredMcpStates: { wiki: "enabled", optionOnly: "disabled" },
        },
        global: {
          behavior: { persistMcp: false },
          layout: { sections: { lsp: true }, expanded: { skills: true } },
          desiredMcpStates: { wiki: "disabled" },
        },
        worktree: {
          behavior: { focusKey: "ctrl+w" },
          layout: { order: ["mcp", "todo"] },
          desiredMcpStates: { wiki: "enabled", context7: "disabled" },
        },
        session: {
          behavior: { toggleKey: "ctrl+s" },
          layout: { expanded: { skills: false } },
          desiredMcpStates: { context7: "enabled" },
        },
      }),
    ).toEqual({
      behavior: {
        toggleKey: "ctrl+s",
        focusKey: "ctrl+w",
        persistMcp: false,
        lspIconStyle: "nerd",
        sectionItemLimits: {},
      },
      layout: {
        sections: { ...builtIns.layout.sections, todo: false },
        expanded: builtIns.layout.expanded,
        order: ["mcp", "todo", "subagents", "skills", "quick_actions", "lsp"],
      },
      desiredMcpStates: { wiki: "enabled", optionOnly: "disabled", context7: "enabled" },
    })
  })
})
