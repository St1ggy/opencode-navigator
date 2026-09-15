import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DEFAULT_SECTION_EXPANSION } from "../src/constants"
import { createPreferencesController } from "../src/controllers/preferences"
import { createPreferencesStore, type PreferencesStore } from "../src/preferences-store"
import type { SectionVisibility } from "../src/state"
import { showFirstRunWizard } from "../src/tui"

function pluginDefaults(sections: SectionVisibility) {
  return {
    sections,
    toggleKey: "ctrl+shift+b",
    focusKey: "ctrl+shift+f",
    persistMcp: true,
    lspIconStyle: "nerd" as const,
  }
}

function memoryStore(): PreferencesStore {
  return {
    async load() {
      return {
        global: {},
        worktrees: {},
        user: {},
      }
    },
    async update() {},
    async flush() {},
  }
}

test("persists section visibility and skipped skill confirmations", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  const values = new Map<string, unknown>()
  const api = {
    kv: {
      ready: true,
      get: (key: string) => values.get(key),
      set: (key: string, value: unknown) => values.set(key, value),
    },
  } as unknown as TuiPluginApi
  const defaults: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: false,
  }
  const review = { name: "review", location: "/skills/review", content: "", description: "Review code" }
  const commit = { name: "commit", location: "/skills/commit", content: "", description: "Create commits" }

  try {
    const controller = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))
    await controller.load()
    expect(controller.sections()).toEqual(defaults)
    expect(controller.shouldConfirmSkill(review)).toBe(true)
    expect(controller.shouldConfirmSkill(commit)).toBe(true)

    controller.toggleSection("lsp")
    expect(controller.sections().lsp).toBe(false)
    controller.toggleSectionExpanded("skills")
    expect(controller.expanded().skills).toBe(true)
    controller.skipSkillConfirmation(review)
    controller.skipSkillConfirmation(commit)
    expect(controller.skippedSkillCount()).toBe(2)
    await controller.saveLayoutAsDefault()
    await controller.flush()

    const restarted = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))
    await restarted.load()
    expect(restarted.sections()).toEqual({ ...defaults, lsp: false })
    expect(restarted.expanded()).toEqual({ ...DEFAULT_SECTION_EXPANSION, skills: true })

    controller.toggleSection("todo")
    controller.toggleSectionExpanded("skills")
    const unchanged = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))
    await unchanged.load()
    expect(unchanged.sections()).toEqual({ ...defaults, lsp: false })
    expect(unchanged.expanded()).toEqual({ ...DEFAULT_SECTION_EXPANSION, skills: true })

    controller.resetSkillConfirmations()
    controller.resetSections()
    await controller.flush()
    expect(controller.skippedSkillCount()).toBe(0)
    expect(controller.sections()).toEqual(defaults)
    expect(controller.expanded()).toEqual(DEFAULT_SECTION_EXPANSION)
    expect(values.size).toBe(0)

    const configured = { ...defaults, mcp: true }
    const reset = createPreferencesController(api, pluginDefaults(configured), createPreferencesStore(directory))
    await reset.load()
    expect(reset.sections()).toEqual(configured)
    expect(reset.expanded()).toEqual(DEFAULT_SECTION_EXPANSION)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("merges interactions made before storage hydration with saved preferences", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  let ready = false
  const values = new Map<string, unknown>()
  const api = {
    kv: {
      get ready() {
        return ready
      },
      get: (key: string) => values.get(key),
      set: (key: string, value: unknown) => values.set(key, value),
    },
  } as unknown as TuiPluginApi
  const defaults: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  }
  const commit = { name: "commit", location: "/skills/commit", content: "" }
  const review = { name: "review", location: "/skills/review", content: "" }

  try {
    const controller = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))
    controller.toggleSection("skills")
    controller.toggleSection("lsp")
    controller.setFocusKey("alt+f")
    controller.skipSkillConfirmation(review)
    controller.skipSkillConfirmation(commit)
    ready = true
    await controller.load()
    await controller.saveLayoutAsDefault()
    await controller.flush()

    expect(controller.sections()).toEqual({ ...defaults, skills: false, lsp: false })
    expect(controller.shouldConfirmSkill(review)).toBe(false)
    expect(controller.shouldConfirmSkill(commit)).toBe(false)
    expect(controller.focusKey()).toBe("alt+f")

    const restarted = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))
    await restarted.load()
    expect(restarted.sections()).toEqual({ ...defaults, skills: false, lsp: false })
    expect(restarted.focusKey()).toBe("alt+f")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("saves a default layout before storage hydration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  let ready = false
  const api = {
    kv: {
      get ready() {
        return ready
      },
      get: () => undefined,
      set: () => {},
    },
  } as unknown as TuiPluginApi
  const defaults: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  }

  try {
    const controller = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))
    controller.toggleSection("lsp")
    controller.toggleSectionExpanded("skills")
    await controller.saveLayoutAsDefault()
    await controller.flush()

    ready = true
    const restarted = createPreferencesController(api, pluginDefaults(defaults), createPreferencesStore(directory))
    await restarted.load()
    expect(restarted.sections().lsp).toBe(false)
    expect(restarted.expanded().skills).toBe(true)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("preserves resets made before storage hydration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  let ready = false
  const api = {
    kv: {
      get ready() {
        return ready
      },
      get: () => undefined,
      set: () => {},
    },
  } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })

  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))
    controller.setFocusKey("alt+f")
    controller.resetPluginSettings()
    controller.resetSections()
    controller.resetSkillConfirmations()
    ready = true
    await controller.load()
    await controller.flush()

    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await restarted.load()
    expect(restarted.sections()).toEqual(defaults.sections)
    expect(restarted.focusKey()).toBe(defaults.focusKey)
    expect(restarted.skippedSkillCount()).toBe(0)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("persists behavior settings and restores configured defaults", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  const api = {
    kv: { ready: true, get: () => undefined, set: () => {} },
    keymap: {
      parseKeySequence: (value: string) => {
        if (!value.trim()) throw new Error("invalid")
        return [value]
      },
    },
  } as unknown as TuiPluginApi
  const sections: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  }

  try {
    const controller = createPreferencesController(api, pluginDefaults(sections), createPreferencesStore(directory))
    await controller.load()
    controller.setToggleKey("alt+s")
    controller.setFocusKey("alt+f")
    controller.toggleMcpPersistence()
    controller.toggleLspIconStyle()
    expect(() => controller.setToggleKey(" ")).toThrow("Enter a valid OpenCode keybinding")
    await controller.flush()

    const changedDefaults = {
      ...pluginDefaults(sections),
      toggleKey: "ctrl+b",
    }
    const restarted = createPreferencesController(api, changedDefaults, createPreferencesStore(directory))
    await restarted.load()
    expect(restarted.toggleKey()).toBe("alt+s")
    expect(restarted.focusKey()).toBe("alt+f")
    expect(restarted.persistMcp()).toBe(false)
    expect(restarted.lspIconStyle()).toBe("text")

    restarted.resetPluginSettings()
    await restarted.flush()

    const reset = createPreferencesController(api, changedDefaults, createPreferencesStore(directory))
    await reset.load()
    expect(reset.toggleKey()).toBe("ctrl+b")
    expect(reset.focusKey()).toBe("ctrl+shift+f")
    expect(reset.persistMcp()).toBe(true)
    expect(reset.lspIconStyle()).toBe("nerd")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("resolves worktree overrides, section order, and scoped resets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  const api = {
    keymap: { parseKeySequence: (value: string) => [value] },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })

  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await controller.load()
    controller.setFocusKey("alt+g")
    controller.setDesiredMcpState("global", "wiki", "enabled")
    controller.setActiveScope("/repo-a")
    controller.setPreferenceScope("worktree")
    controller.setFocusKey("alt+w")
    controller.toggleSection("mcp")
    controller.moveSection("mcp", -1)
    await controller.saveLayoutAsDefault()
    controller.setDesiredMcpState("/repo-a", "wiki", "disabled")
    await controller.flush()

    controller.setActiveScope("/repo-b")
    expect(controller.focusKey()).toBe("alt+g")
    expect(controller.sections().mcp).toBe(true)
    expect(controller.desiredMcpState("/repo-b", "wiki")).toBe("enabled")

    controller.setActiveScope("/repo-a")
    expect(controller.focusKey()).toBe("alt+w")
    expect(controller.sections().mcp).toBe(false)
    expect(controller.sectionOrder().indexOf("mcp")).toBe(4)
    expect(controller.desiredMcpState("/repo-a", "wiki")).toBe("disabled")

    controller.resetSections()
    controller.resetPluginSettings()
    controller.resetMcpStates()
    await controller.flush()
    expect(controller.focusKey()).toBe("alt+g")
    expect(controller.sections().mcp).toBe(true)
    expect(controller.desiredMcpState("/repo-a", "wiki")).toBe("enabled")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("saves the active worktree session layout when global scope is selected", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })
  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await controller.load()
    controller.setActiveScope("/repo-a")
    controller.toggleSelectedSection("lsp")
    expect(controller.sections().lsp).toBe(false)
    await controller.saveLayoutAsDefault()
    controller.setActiveScope("/repo-b")
    expect(controller.sections().lsp).toBe(false)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("creates, applies, updates, renames, deletes, and persists layout presets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })
  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await controller.load()
    expect(controller.layoutPresets()).toEqual({})

    controller.setActiveScope("/repo-a")
    controller.setPreferenceScope("worktree")
    controller.toggleSelectedSection("lsp")
    controller.moveSelectedSection("mcp", -1)
    expect(controller.saveLayoutPreset(" Focus ")).toBe("Focus")
    expect(() => controller.saveLayoutPreset("focus")).toThrow("already exists")

    controller.toggleSelectedSection("lsp")
    controller.applyLayoutPreset(controller.layoutPresets().Focus)
    expect(controller.selectedSections().lsp).toBe(false)
    expect(controller.selectedSectionOrder().indexOf("mcp")).toBe(4)

    controller.toggleSelectedSection("skills")
    expect(controller.updateLayoutPreset("Focus")).toBe(true)
    expect(controller.renameLayoutPreset("Focus", "Deep work")).toBe("Deep work")
    expect(controller.layoutPresets().Focus).toBeUndefined()
    expect(controller.layoutPresets()["Deep work"].sections.skills).toBe(false)
    await controller.flush()

    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await restarted.load()
    expect(Object.keys(restarted.layoutPresets())).toEqual(["Deep work"])
    expect(restarted.deleteLayoutPreset("Deep work")).toBe(true)
    expect(restarted.deleteLayoutPreset("Deep work")).toBe(false)
    await restarted.flush()

    const cleared = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await cleared.load()
    expect(cleared.layoutPresets()).toEqual({})
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("manages user-wide MCP presets and favorite skills", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })
  const review = { name: "review", location: "/skills/review", content: "" }
  try {
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await controller.load()
    expect(controller.saveMcpPreset(" Work ", { wiki: "disabled", context7: "enabled" })).toBe("Work")
    expect(() => controller.saveMcpPreset("work", { wiki: "enabled" })).toThrow("already exists")
    controller.toggleFavoriteSkill(review)
    expect(controller.isFavoriteSkill(review)).toBe(true)
    expect(controller.updateMcpPreset("Work", { wiki: "enabled" })).toBe(true)
    expect(controller.renameMcpPreset("Work", "Review")).toBe("Review")
    controller.setActiveScope("/another-worktree")
    expect(controller.mcpPresets()).toEqual({ Review: { wiki: "enabled" } })
    expect(controller.isFavoriteSkill(review)).toBe(true)
    await controller.flush()

    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await restarted.load()
    expect(restarted.mcpPresets()).toEqual({ Review: { wiki: "enabled" } })
    expect(restarted.isFavoriteSkill(review)).toBe(true)
    expect(restarted.deleteMcpPreset("Review")).toBe(true)
    restarted.toggleFavoriteSkill(review)
    await restarted.flush()

    const cleared = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await cleared.load()
    expect(cleared.mcpPresets()).toEqual({})
    expect(cleared.isFavoriteSkill(review)).toBe(false)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("defers favorite toggles and MCP preset editing until hydration", async () => {
  let finish!: () => void
  const review = { name: "review", location: "/skills/review", content: "" }
  const store: PreferencesStore = {
    load: () =>
      new Promise((resolve) => {
        finish = () => resolve({ global: {}, worktrees: {}, user: { favoriteSkills: [review.location] } })
      }),
    async update() {},
    async flush() {},
  }
  const api = { ui: { toast: () => {} } } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })
  const controller = createPreferencesController(api, defaults, store)

  controller.toggleFavoriteSkill(review)
  expect(() => controller.saveMcpPreset("Work", { wiki: "enabled" })).toThrow("still loading")
  finish()
  await controller.load()
  await Promise.resolve()
  expect(controller.ready()).toBe(true)
  expect(controller.isFavoriteSkill(review)).toBe(false)
})

test("reconciles conflicting MCP preset saves from independent controllers", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  const toasts: string[] = []
  const api = {
    ui: { toast: (toast: { message: string }) => toasts.push(toast.message) },
  } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })
  try {
    const first = createPreferencesController(api, defaults, createPreferencesStore(directory))
    const second = createPreferencesController(api, defaults, createPreferencesStore(directory))
    await Promise.all([first.load(), second.load()])
    first.saveMcpPreset("Focus", { wiki: "enabled" })
    second.saveMcpPreset("focus", { wiki: "disabled" })
    await Promise.all([first.flush(), second.flush()])

    const persisted = (await createPreferencesStore(directory).load()).user.mcpPresets ?? {}
    expect(first.mcpPresets()).toEqual(persisted)
    expect(second.mcpPresets()).toEqual(persisted)
    expect(toasts).toContain("Preset changed in another OpenCode instance; reloaded saved presets")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("opens the setup wizard only once after preference hydration", async () => {
  const values = new Map<string, unknown>()
  let opened = 0
  const api = {
    kv: {
      ready: true,
      get: (key: string) => values.get(key),
      set: (key: string, value: unknown) => values.set(key, value),
    },
    ui: {
      dialog: {
        replace: () => opened++,
      },
    },
  } as unknown as TuiPluginApi
  const defaults: SectionVisibility = {
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  }
  const preferences = createPreferencesController(api, pluginDefaults(defaults), memoryStore())

  expect(await showFirstRunWizard(api, preferences)).toBe(true)
  expect(opened).toBe(1)
  expect(values.size).toBe(0)
  expect(await showFirstRunWizard(api, preferences)).toBe(false)
  expect(opened).toBe(1)
})

test("persists onboarding completion across controller restarts without changing KV", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  const values = new Map<string, unknown>()
  let opened = 0
  const api = {
    state: { path: {} },
    kv: { ready: true, get: (key: string) => values.get(key), set: () => {} },
    ui: { dialog: { replace: () => opened++ }, toast: () => {} },
  } as unknown as TuiPluginApi
  const defaults = pluginDefaults({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })

  try {
    const first = createPreferencesController(api, defaults, createPreferencesStore(directory))
    expect(await showFirstRunWizard(api, first)).toBe(true)
    await first.flush()
    const restarted = createPreferencesController(api, defaults, createPreferencesStore(directory))
    expect(await showFirstRunWizard(api, restarted)).toBe(false)
    expect(opened).toBe(1)
    expect(values.size).toBe(0)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
