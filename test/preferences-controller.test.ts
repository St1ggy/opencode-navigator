import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { SectionVisibility } from "../src/state"
import { createPreferencesController, showFirstRunWizard } from "../src/tui"

test("persists section visibility and skipped skill confirmations", () => {
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

  const controller = createPreferencesController(api, defaults)
  controller.load()
  expect(controller.sections()).toEqual({ ...defaults, skills: false, lsp: false })
  expect(controller.shouldConfirmSkill(review)).toBe(false)
  expect(controller.shouldConfirmSkill(commit)).toBe(true)

  controller.toggleSection("lsp")
  expect(controller.sections().lsp).toBe(true)
  controller.skipSkillConfirmation(commit)
  expect(controller.skippedSkillCount()).toBe(2)

  controller.resetSkillConfirmations()
  controller.resetSections()
  expect(controller.skippedSkillCount()).toBe(0)
  expect(controller.sections()).toEqual(defaults)
  expect(values.get("opencode-pretty-sidebar.skill-confirmations")).toEqual([])
  expect(values.get("opencode-pretty-sidebar.section-visibility")).toEqual({})
})

test("merges interactions made before KV hydration with saved preferences", () => {
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

  const controller = createPreferencesController(api, defaults)
  controller.toggleSection("skills")
  controller.toggleSection("lsp")
  controller.skipSkillConfirmation(commit)
  ready = true
  controller.load()

  expect(controller.sections()).toEqual({ ...defaults, skills: false, lsp: false })
  expect(controller.shouldConfirmSkill(review)).toBe(false)
  expect(controller.shouldConfirmSkill(commit)).toBe(false)
  expect(values.get("opencode-pretty-sidebar.section-visibility")).toEqual({ skills: false, lsp: false })
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
  const preferences = createPreferencesController(api, defaults)

  expect(showFirstRunWizard(api, preferences, "ctrl+shift+b", "nerd")).toBe(true)
  expect(opened).toBe(1)
  expect(values.get("opencode-pretty-sidebar.onboarding.v1")).toBe(true)
  expect(showFirstRunWizard(api, preferences, "ctrl+shift+b", "nerd")).toBe(false)
  expect(opened).toBe(1)
})
