/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import {
  FirstRunWizard,
  LspBadge,
  McpSection,
  openSettings,
  Section,
  SettingsDialog,
  SidebarToggleBinding,
  SkillsSection,
  // @ts-expect-error The package intentionally publishes JavaScript without declarations.
} from "../dist/tui.js"

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
  const setup = await testRender(() => <LspBadge api={api} id="typescript" status="connected" iconStyle="text" />, {
    width: 30,
    height: 1,
  })

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
    toggleKey: () => "ctrl+shift+b",
    focusKey: () => "ctrl+shift+f",
    lspIconStyle: () => "nerd",
    toggleSection(name: keyof ReturnType<typeof sections>) {
      setSections((value) => ({ ...value, [name]: !value[name] }))
    },
  }
  const setup = await testRender(() => <FirstRunWizard api={api} preferences={preferences} />, {
    width: 80,
    height: 18,
  })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("Welcome to Pretty Sidebar")
    expect(setup.captureCharFrame()).toContain("Toggle: ctrl+shift+b")
    expect(setup.captureCharFrame()).toContain("Focus: ctrl+shift+f")
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
    state: () => ({ status: "ready" }),
    refresh: async () => items,
    retry: async () => items,
    use: async () => {},
  }
  const preferences = {
    expanded: () => expandedLayout,
    toggleSectionExpanded: () => {},
    shouldConfirmSkill: () => false,
    skipSkillConfirmation: () => {},
  }
  const setup = await testRender(() => <SkillsSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 8,
  })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("review-code")
    expect(setup.captureCharFrame()).toContain("commit")

    const filterLine = setup
      .captureCharFrame()
      .split("\n")
      .findIndex((line) => line.includes("Filter skills"))
    await setup.mockMouse.pressDown(8, filterLine)
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
    target: () => ({ key: "test", scope: "/test", routing: { directory: "/test" } }),
    list: () => items,
    state: () => ({ status: "ready" }),
    retry: async () => items,
    serverState: () => ({ status: "ready" }),
    retryServer: async () => {},
    mutating: () => false,
    toggle: async () => {},
  }
  const preferences = { expanded: () => expandedLayout, toggleSectionExpanded: () => {} }
  const setup = await testRender(() => <McpSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 8,
  })

  try {
    await setup.renderOnce()
    expect(setup.captureCharFrame()).toContain("context7")
    expect(setup.captureCharFrame()).toContain("tracker")

    const filterLine = setup
      .captureCharFrame()
      .split("\n")
      .findIndex((line) => line.includes("Filter MCP"))
    await setup.mockMouse.pressDown(8, filterLine)
    await setup.mockInput.typeText("track")
    await setup.renderOnce()
    expect(setup.captureCharFrame()).not.toContain("context7")
    expect(setup.captureCharFrame()).toContain("tracker")
  } finally {
    setup.renderer.destroy()
  }
})

test("the built Skills section keeps cached rows visible with an inline retry", async () => {
  let retries = 0
  const items = [{ name: "cached-skill", description: "Cached", location: "/skills/cached", content: "" }]
  const api = {
    theme: { current: sidebarTheme },
    ui: { dialog: { replace: () => {} }, toast: () => {} },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: "test", routing: { directory: "/test" } }),
    list: () => items,
    error: () => "skills unavailable",
    state: () => ({
      status: "error",
      error: { operation: "refresh skills", target: "test", message: "skills unavailable", retryable: true },
    }),
    refresh: async () => items,
    retry: async () => {
      retries++
      return items
    },
    use: async () => {},
  }
  const preferences = {
    expanded: () => expandedLayout,
    toggleSectionExpanded: () => {},
    shouldConfirmSkill: () => false,
    skipSkillConfirmation: () => {},
  }
  const setup = await testRender(() => <SkillsSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 8,
  })

  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("skills unavailable")
    expect(frame).toContain("Retry")
    expect(frame).toContain("cached-skill")

    const lines = frame.split("\n")
    const retryRow = lines.findIndex((line) => line.includes("Retry"))
    await setup.mockMouse.pressDown(lines[retryRow].indexOf("Retry"), retryRow)
    expect(retries).toBe(1)
  } finally {
    setup.renderer.destroy()
  }
})

test("the built MCP section shows cached servers with an inline refresh retry", async () => {
  let retries = 0
  const items = [{ name: "cached-mcp", status: "connected" }]
  const api = {
    theme: { current: sidebarTheme },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: "test", scope: "/test", routing: { directory: "/test" } }),
    list: () => items,
    state: () => ({
      status: "error",
      error: { operation: "refresh MCP servers", target: "test", message: "MCP unavailable", retryable: true },
    }),
    retry: async () => {
      retries++
      return items
    },
    serverState: () => ({ status: "ready" }),
    retryServer: async () => {},
    mutating: () => false,
    toggle: async () => {},
  }
  const preferences = { expanded: () => expandedLayout, toggleSectionExpanded: () => {} }
  const setup = await testRender(() => <McpSection api={api} controller={controller} preferences={preferences} />, {
    width: 44,
    height: 7,
  })

  try {
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain("MCP unavailable")
    expect(frame).toContain("Retry")
    expect(frame).toContain("cached-mcp")

    const lines = frame.split("\n")
    const retryRow = lines.findIndex((line) => line.includes("Retry"))
    await setup.mockMouse.pressDown(lines[retryRow].indexOf("Retry"), retryRow)
    expect(retries).toBe(1)
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
  let mcpToggles = 0
  let iconToggles = 0
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
    sectionOrder: () => ["todo", "subagents", "skills", "quick_actions", "lsp", "mcp"],
    selectedSections: sections,
    selectedExpanded: () => expandedLayout,
    selectedSectionOrder: () => ["todo", "subagents", "skills", "quick_actions", "lsp", "mcp"],
    preferenceScope: () => "global",
    preferenceScopeLabel: () => "Global",
    canUseWorktreeScope: () => false,
    setPreferenceScope: () => {},
    persistMcp: () => true,
    selectedPersistMcp: () => true,
    lspIconStyle: () => "nerd",
    selectedLspIconStyle: () => "nerd",
    toggleKey: () => "ctrl+shift+b",
    selectedToggleKey: () => "ctrl+shift+b",
    focusKey: () => "ctrl+shift+f",
    selectedFocusKey: () => "ctrl+shift+f",
    skippedSkillCount: () => 0,
    toggleSection: () => {},
    toggleSelectedSection: () => {},
    toggleMcpPersistence: () => mcpToggles++,
    toggleLspIconStyle: () => iconToggles++,
    setToggleKey: () => {},
    setFocusKey: () => {},
    resetSections: () => {},
    resetPluginSettings: () => {},
    resetMcpStates: () => {},
    resetSkillConfirmations: () => {},
    moveSection: () => {},
    moveSelectedSection: () => {},
    saveLayoutAsDefault: async () => {
      saved++
    },
  }
  const setup = await testRender(() => <SettingsDialog api={api} preferences={preferences} />, {
    width: 100,
    height: 20,
  })

  try {
    await setup.flush()
    const initialFrame = setup.captureCharFrame()
    expect(initialFrame).toContain("Sidebar settings")
    expect(initialFrame).toContain("Sections")
    expect(initialFrame).toContain("Todo")
    expect(initialFrame).toContain("↑/↓ navigate · enter select")
    expect(initialFrame).not.toContain("Save current layout as default")

    const next = layer?.commands.find((command) => command.name.endsWith(".settings.next"))
    const select = layer?.commands.find((command) => command.name.endsWith(".settings.select"))
    for (let index = 0; index < 14; index++) next?.run()
    await setup.flush()
    expect(setup.captureCharFrame()).toContain("Remember MCP states")
    select?.run()
    expect(mcpToggles).toBe(1)
    next?.run()
    select?.run()
    expect(iconToggles).toBe(1)
    next?.run()
    next?.run()
    next?.run()
    await setup.flush()
    const defaultFrame = setup.captureCharFrame()
    const saveLine = defaultFrame.split("\n").find((line) => line.includes("Save current layout as default"))
    expect(defaultFrame).toContain("Sidebar settings")
    expect(defaultFrame).toContain("Defaults & help")
    expect(defaultFrame).toContain("↑/↓ navigate · enter select")
    expect(defaultFrame).not.toContain("Todo")
    expect(saveLine).toContain("4 visible · 2 expanded")
    select?.run()
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

  openSettings(api, {})

  expect(render).toBeDefined()
  expect(size).toBe("xlarge")
})

test("the sidebar shortcut binding follows runtime settings", async () => {
  const [shortcut, setShortcut] = createSignal("ctrl+shift+b")
  const registered: string[] = []
  const disposed: string[] = []
  const api = {
    route: { current: { name: "session" } },
    keymap: {
      registerLayer: (layer: { bindings: Array<{ key: string }> }) => {
        const key = layer.bindings[0].key
        registered.push(key)
        return () => disposed.push(key)
      },
      dispatchCommand: () => ({ ok: true }),
    },
  } as unknown as TuiPluginApi
  const setup = await testRender(() => <SidebarToggleBinding api={api} preferences={{ toggleKey: shortcut }} />, {
    width: 1,
    height: 1,
  })

  try {
    await setup.renderOnce()
    expect(registered).toEqual(["ctrl+shift+b"])

    setShortcut("alt+s")
    await setup.renderOnce()
    expect(registered).toEqual(["ctrl+shift+b", "alt+s"])
    expect(disposed).toEqual(["ctrl+shift+b"])
  } finally {
    setup.renderer.destroy()
  }
  expect(disposed).toEqual(["ctrl+shift+b", "alt+s"])
})
