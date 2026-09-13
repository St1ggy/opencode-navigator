/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
// @ts-expect-error The package intentionally publishes JavaScript without declarations.
import { FirstRunWizard, LspBadge, McpSection, openSettings, Section, SettingsDialog, SkillsSection } from "../dist/tui.js"

const sidebarTheme = {
  accent: "#ff9e64",
  text: "#c0caf5",
  textMuted: "#a9b1d6",
  backgroundPanel: "#16161e",
  backgroundElement: "#292e42",
  borderSubtle: "#3b4261",
  success: "#9ece6a",
  error: "#f7768e",
  warning: "#e0af68",
}

const expandedLayout = {
  todo: false,
  subagents: false,
  skills: true,
  quick_actions: false,
  lsp: false,
  mcp: true,
}

test("the built sidebar remains reactive and toggles on mouse down", async () => {
  const api = {
    theme: {
      current: {
        accent: "#ff9e64",
        text: "#c0caf5",
        textMuted: "#a9b1d6",
      },
    },
  } as unknown as TuiPluginApi
  function TestSection() {
    const [open, setOpen] = createSignal(false)
    return (
      <Section api={api} title="SKILLS" summary="3" open={open()} onToggle={() => setOpen((value) => !value)}>
        <text>content</text>
      </Section>
    )
  }

  const setup = await testRender(() => <TestSection />, { width: 30, height: 3 })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain("content")
    await setup.mockMouse.pressDown(1, 0)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("content")
  } finally {
    setup.renderer.destroy()
  }
})

test("the built LSP badge toggles its server name on mouse down", async () => {
  const api = {
    theme: {
      current: {
        success: "#9ece6a",
        error: "#f7768e",
        textMuted: "#a9b1d6",
      },
    },
  } as unknown as TuiPluginApi
  const setup = await testRender(
    () => <LspBadge api={api} id="typescript" status="connected" iconStyle="text" />,
    { width: 30, height: 1 },
  )

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain("typescript")
    await setup.mockMouse.pressDown(0, 0)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("TS typescript")
    await setup.mockMouse.pressDown(0, 0)
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain("typescript")
  } finally {
    setup.renderer.destroy()
  }
})

test("the built first-run wizard explains controls and changes section settings", async () => {
  const [sections, setSections] = createSignal({
    todo: true,
    subagents: true,
    skills: true,
    quick_actions: true,
    lsp: true,
    mcp: true,
  })
  let layer: { commands: Array<{ name: string; run: () => void }> } | undefined
  const api = {
    theme: {
      current: {
        accent: "#ff9e64",
        text: "#c0caf5",
        textMuted: "#a9b1d6",
        backgroundElement: "#292e42",
        primary: "#7aa2f7",
        selectedListItemText: "#16161e",
      },
    },
    keymap: {
      registerLayer: (value: typeof layer) => {
        layer = value
        return () => {}
      },
    },
    ui: { dialog: { clear: () => {} } },
  } as unknown as TuiPluginApi
  const preferences = {
    sections,
    toggleSection(name: keyof ReturnType<typeof sections>) {
      setSections((value) => ({ ...value, [name]: !value[name] }))
    },
  }
  const setup = await testRender(
    () => (
      <FirstRunWizard
        api={api}
        preferences={preferences}
        toggleKey="ctrl+shift+b"
        lspIconStyle="nerd"
      />
    ),
    { width: 80, height: 18 },
  )

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Welcome to Pretty Sidebar")
    expect(setup.captureCharFrame()).toContain("Toggle: ctrl+shift+b")
    expect(setup.captureCharFrame()).toContain("LSP icons: Nerd Font")
    layer?.commands.find((command) => command.name.endsWith(".wizard.select"))?.run()
    await setup.renderOnce()
    expect(sections().todo).toBe(false)
    expect(setup.captureCharFrame()).toContain("☐ Todo")
  } finally {
    setup.renderer.destroy()
  }
})

test("the built Skills section filters by name and description", async () => {
  const items = [
    { name: "review-code", description: "Review pending changes", location: "/skills/review", content: "" },
    { name: "commit", description: "Create commits", location: "/skills/commit", content: "" },
  ]
  const api = {
    theme: { current: sidebarTheme },
    kv: { get: () => true, set: () => {} },
    ui: { dialog: { replace: () => {} }, toast: () => {} },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: "test", routing: { directory: "/test" } }),
    list: () => items,
    error: () => undefined,
    refresh: async () => items,
    use: async () => {},
  }
  const preferences = {
    expanded: () => expandedLayout,
    toggleSectionExpanded: () => {},
    shouldConfirmSkill: () => false,
    skipSkillConfirmation: () => {},
  }
  const setup = await testRender(
    () => <SkillsSection api={api} controller={controller} preferences={preferences} />,
    { width: 44, height: 8 },
  )

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("review-code")
    expect(setup.captureCharFrame()).toContain("commit")

    await setup.mockMouse.pressDown(8, 2)
    await setup.mockInput.typeText("pending")
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("review-code")
    expect(setup.captureCharFrame()).not.toContain("commit")
  } finally {
    setup.renderer.destroy()
  }
})

test("the built MCP section filters servers by name", async () => {
  const items = [
    { name: "context7", status: "connected" },
    { name: "tracker", status: "connected" },
  ]
  const api = {
    theme: { current: sidebarTheme },
    kv: { get: () => true, set: () => {} },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi
  const controller = {
    list: () => items,
    toggle: async () => {},
  }
  const preferences = { expanded: () => expandedLayout, toggleSectionExpanded: () => {} }
  const setup = await testRender(
    () => <McpSection api={api} controller={controller} preferences={preferences} />,
    { width: 44, height: 8 },
  )

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("context7")
    expect(setup.captureCharFrame()).toContain("tracker")

    await setup.mockMouse.pressDown(8, 2)
    await setup.mockInput.typeText("track")
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain("context7")
    expect(setup.captureCharFrame()).toContain("tracker")
  } finally {
    setup.renderer.destroy()
  }
})

test("the built settings dialog saves the current layout as default", async () => {
  const [sections] = createSignal({
    todo: true,
    subagents: false,
    skills: true,
    quick_actions: true,
    lsp: false,
    mcp: true,
  })
  let layer: { commands: Array<{ name: string; run: () => void }> } | undefined
  let saved = 0
  const api = {
    theme: { current: sidebarTheme },
    keymap: {
      registerLayer: (value: typeof layer) => {
        layer = value
        return () => {}
      },
    },
    ui: {
      dialog: { clear: () => {} },
      toast: () => {},
    },
  } as unknown as TuiPluginApi
  const preferences = {
    sections,
    expanded: () => expandedLayout,
    skippedSkillCount: () => 0,
    toggleSection: () => {},
    resetSections: () => {},
    resetSkillConfirmations: () => {},
    saveLayoutAsDefault: async () => {
      saved++
    },
  }
  const setup = await testRender(
    () => <SettingsDialog api={api} preferences={preferences} toggleKey="ctrl+shift+b" lspIconStyle="nerd" />,
    { width: 100, height: 30 },
  )

  try {
    await setup.renderOnce()
    const lines = setup.captureCharFrame().split("\n")
    const saveLine = lines.findIndex((line) => line.includes("Save current layout as default"))
    expect(saveLine).toBeGreaterThan(-1)
    expect(lines[saveLine]).toContain("4 visible · 2 expanded")

    const next = layer?.commands.find((command) => command.name.endsWith(".settings.next"))
    for (let index = 0; index < 6; index++) next?.run()
    layer?.commands.find((command) => command.name.endsWith(".settings.select"))?.run()
    await Promise.resolve()
    expect(saved).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
})

test("the built settings dialog opens at a spacious width", () => {
  let size: string | undefined
  let render: (() => unknown) | undefined
  const api = {
    ui: {
      dialog: {
        replace: (value: () => unknown) => {
          render = value
        },
        setSize: (value: string) => {
          size = value
        },
      },
    },
  } as unknown as TuiPluginApi

  openSettings(api, {}, "ctrl+shift+b", "nerd")

  expect(render).toBeDefined()
  expect(size).toBe("large")
})
