import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createSectionPreferencesStore, type SectionPreferencesStore } from "../src/preferences-store"
import type { SectionVisibility } from "../src/state"
import { createPreferencesController, showFirstRunWizard } from "../src/tui"

function memoryStore(): SectionPreferencesStore {
  return {
    async load() {
      return {}
    },
    async update() {},
    async flush() {},
  }
}

test("persists section visibility and skipped skill confirmations", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  const values = new Map<string, unknown>([
    ["opencode-pretty-sidebar.section-visibility", { skills: false, lsp: false }],
    ["opencode-pretty-sidebar.skill-confirmations", ["/skills/review"]],
  ])
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
    const controller = createPreferencesController(api, defaults, createSectionPreferencesStore(directory))
    await controller.load()
    expect(controller.sections()).toEqual({ ...defaults, skills: false, lsp: false })
    expect(controller.shouldConfirmSkill(review)).toBe(false)
    expect(controller.shouldConfirmSkill(commit)).toBe(true)

    controller.toggleSection("lsp")
    expect(controller.sections().lsp).toBe(true)
    controller.skipSkillConfirmation(commit)
    expect(controller.skippedSkillCount()).toBe(2)
    await controller.flush()

    const restarted = createPreferencesController(api, defaults, createSectionPreferencesStore(directory))
    await restarted.load()
    expect(restarted.sections()).toEqual({ ...defaults, skills: false, lsp: true })

    controller.resetSkillConfirmations()
    controller.resetSections()
    await controller.flush()
    expect(controller.skippedSkillCount()).toBe(0)
    expect(controller.sections()).toEqual(defaults)
    expect(values.get("opencode-pretty-sidebar.skill-confirmations")).toEqual([])

    const reset = createPreferencesController(api, defaults, createSectionPreferencesStore(directory))
    await reset.load()
    expect(reset.sections()).toEqual(defaults)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("merges interactions made before KV hydration with saved preferences", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  let ready = false
  const values = new Map<string, unknown>([
    ["opencode-pretty-sidebar.section-visibility", { skills: false }],
    ["opencode-pretty-sidebar.skill-confirmations", ["/skills/review"]],
  ])
  const api = {
    kv: {
      get ready() { return ready },
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
    const controller = createPreferencesController(api, defaults, createSectionPreferencesStore(directory))
    controller.toggleSection("skills")
    controller.toggleSection("lsp")
    controller.skipSkillConfirmation(commit)
    ready = true
    await controller.load()
    await controller.flush()

    expect(controller.sections()).toEqual({ ...defaults, skills: false, lsp: false })
    expect(controller.shouldConfirmSkill(review)).toBe(false)
    expect(controller.shouldConfirmSkill(commit)).toBe(false)

    const restarted = createPreferencesController(api, defaults, createSectionPreferencesStore(directory))
    await restarted.load()
    expect(restarted.sections()).toEqual({ ...defaults, skills: false, lsp: false })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("flushes section changes when KV becomes ready during shutdown", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pretty-sidebar-preferences-"))
  let ready = false
  const api = {
    kv: {
      get ready() { return ready },
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
    const controller = createPreferencesController(api, defaults, createSectionPreferencesStore(directory))
    controller.toggleSection("lsp")
    setTimeout(() => {
      ready = true
    }, 20)
    await controller.flush()

    const restarted = createPreferencesController(api, defaults, createSectionPreferencesStore(directory))
    await restarted.load()
    expect(restarted.sections().lsp).toBe(false)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("opens the setup wizard only on the first run", () => {
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
  const preferences = createPreferencesController(api, defaults, memoryStore())

  expect(showFirstRunWizard(api, preferences, "ctrl+shift+b", "nerd")).toBe(true)
  expect(opened).toBe(1)
  expect(values.get("opencode-pretty-sidebar.onboarding.v1")).toBe(true)
  expect(showFirstRunWizard(api, preferences, "ctrl+shift+b", "nerd")).toBe(false)
  expect(opened).toBe(1)
})
