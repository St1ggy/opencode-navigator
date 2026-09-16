/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { testRender } from "@opentui/solid"
import { QuickActionsDialog } from "../src/dialogs/quick-actions"
import { QuickActionsSection } from "../src/components/sections"
import { createPreferencesController } from "../src/controllers/preferences"
import { pluginConfig } from "../src/config"
import { QUICK_ACTION_IDS } from "../src/quick-actions"

test("quick action options sanitize IDs, append missing actions and preserve explicit visibility", () => {
  const config = pluginConfig({
    quick_action_order: ["session.export", "bad", "session.export"],
    quick_action_visibility: { "session.rename": false, "session.export": "yes", unknown: true },
  })
  expect(config.quickActionOrder).toEqual([
    "session.export",
    ...QUICK_ACTION_IDS.filter((id) => id !== "session.export"),
  ])
  expect(config.quickActionVisibility).toEqual({ "session.rename": false })
})

test("Quick Actions settings change live visibility and ordering and keep selection on the moved action", async () => {
  let commands: Array<{ name: string; run: () => void }> = []
  let back = 0
  const dispatched: string[] = []
  const api = {
    theme: {
      current: {
        text: "#ffffff",
        textMuted: "#888888",
        accent: "#00ffff",
        backgroundElement: "#222222",
        backgroundPanel: "#111111",
      },
    },
    state: { path: { directory: "/repo" } },
    route: { current: { name: "home" } },
    keymap: {
      registerLayer: (layer: { commands: typeof commands }) => {
        commands = layer.commands
        return () => {}
      },
      getCommandBindings: () => new Map(),
      dispatchCommand: (id: string) => {
        dispatched.push(id)
        return { ok: true }
      },
    },
    keys: { formatBindings: () => "" },
    ui: { toast() {} },
  } as unknown as TuiPluginApi
  const preferences = createPreferencesController(api, pluginConfig(undefined), {
    load: async () => ({ global: {}, worktrees: {}, user: {} }),
    update: async () => {},
    flush: async () => {},
  })
  await preferences.load()
  preferences.toggleSectionExpanded("quick_actions")
  const settings = await testRender(
    () => <QuickActionsDialog api={api} preferences={preferences} onBack={() => back++} />,
    { width: 60, height: 20 },
  )
  const run = (name: string) => commands.find((command) => command.name.endsWith(`.${name}`))?.run()
  try {
    await settings.flush()
    run("toggle")
    expect(preferences.quickActionVisible("session.rename")).toBe(false)
    run("down")
    run("toggle")
    expect(preferences.quickActionVisible("session.rename")).toBe(true)
    expect(preferences.quickActionOrder().slice(0, 2)).toEqual(["session.timeline", "session.rename"])
    run("back")
    expect(back).toBe(1)
  } finally {
    settings.renderer.destroy()
  }
  const sidebar = await testRender(() => <QuickActionsSection api={api} preferences={preferences} />, {
    width: 45,
    height: 18,
  })
  try {
    await sidebar.flush()
    const frame = sidebar.captureCharFrame()
    expect(frame.indexOf("Timeline")).toBeLessThan(frame.indexOf("Rename"))
    const lines = frame.split("\n")
    const row = lines.findIndex((line) => line.includes("Timeline"))
    await sidebar.mockMouse.click(lines[row].indexOf("Timeline"), row)
    expect(dispatched).toEqual(["session.timeline"])
    for (const id of QUICK_ACTION_IDS) preferences.toggleQuickAction(id)
    await sidebar.flush()
    expect(sidebar.captureCharFrame()).toContain("No quick actions selected")
  } finally {
    sidebar.renderer.destroy()
  }
})
