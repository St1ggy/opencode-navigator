/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
// @ts-expect-error The package intentionally publishes JavaScript without declarations.
import { FirstRunWizard, LspBadge, Section } from "../dist/tui.js"

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
