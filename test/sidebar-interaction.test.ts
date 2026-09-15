import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { ScrollBoxRenderable, type Renderable, type RGBA } from "@opentui/core"
import { sidebarInteractiveColors } from "../src/components/common"
import { createSidebarInteraction, isEffectivelyVisible } from "../src/sidebar-interaction"

function testApi() {
  const layers: Array<Record<string, unknown>> = []
  const dispatched: Array<{ command: string; options?: unknown }> = []
  const renderer = {
    currentFocusedRenderable: null as Renderable | null,
    on: () => renderer,
    off: () => renderer,
  }
  const api = {
    renderer,
    route: { current: { name: "session", params: { sessionID: "session" } } },
    keymap: {
      registerLayer(layer: Record<string, unknown>) {
        layers.push(layer)
        return () => {}
      },
      dispatchCommand(command: string, options?: unknown) {
        dispatched.push({ command, options })
        return { ok: true as const }
      },
    },
    ui: { dialog: { replace: () => {}, setSize: () => {} } },
  } as unknown as TuiPluginApi
  return { api, renderer, layers, dispatched }
}

function renderable(
  renderer: { currentFocusedRenderable: Renderable | null },
  id: string,
  parent: Renderable | null = null,
) {
  const value = {
    id,
    parent,
    visible: true,
    isDestroyed: false,
    focused: false,
    focus() {
      const previous = renderer.currentFocusedRenderable as unknown as { focused: boolean } | null
      if (previous) previous.focused = false
      value.focused = true
      renderer.currentFocusedRenderable = value as unknown as Renderable
    },
    blur() {
      value.focused = false
      if (renderer.currentFocusedRenderable === (value as unknown as Renderable))
        renderer.currentFocusedRenderable = null
    },
  }
  return value as unknown as Renderable
}

test("interaction orders, wraps, activates, blocks disabled items, and falls back after unmount", () => {
  const { api, renderer } = testApi()
  const interaction = createSidebarInteraction(api)
  const outside = renderable(renderer, "outside", renderable(renderer, "app"))
  const root = renderable(renderer, "sidebar", renderable(renderer, "host"))
  const actions: string[] = []
  interaction.setContentRoot(root)
  const unregisterB = interaction.register({
    id: "b",
    order: 20,
    renderable: renderable(renderer, "b", root),
    activate: () => actions.push("b"),
  })
  interaction.register({
    id: "a",
    order: 10,
    renderable: renderable(renderer, "a", root),
    activate: () => actions.push("a"),
  })
  interaction.register({
    id: "disabled",
    order: 30,
    renderable: renderable(renderer, "disabled", root),
    disabled: () => true,
    activate: () => actions.push("disabled"),
  })

  outside.focus()
  interaction.focus(outside)
  expect(interaction.selectedId()).toBe("a")
  interaction.move(-1)
  expect(interaction.selectedId()).toBe("disabled")
  expect(interaction.activate()).toBe(false)
  interaction.move(1)
  interaction.move(1)
  expect(interaction.selectedId()).toBe("b")
  expect(interaction.activate()).toBe(true)
  expect(actions).toEqual(["b"])

  unregisterB()
  expect(interaction.selectedId()).toBe("disabled")
  expect(interaction.leave()).toBe(true)
  expect(renderer.currentFocusedRenderable).toBe(outside)
})

test("interaction reevaluates dynamic row order after a section move", () => {
  const { api, renderer } = testApi()
  const interaction = createSidebarInteraction(api)
  const root = renderable(renderer, "sidebar", renderable(renderer, "host"))
  let firstOrder = 100
  let secondOrder = 200
  interaction.setContentRoot(root)
  interaction.register({
    id: "first-row",
    order: () => firstOrder,
    renderable: renderable(renderer, "first-row", root),
    activate: () => {},
  })
  interaction.register({
    id: "second-row",
    order: () => secondOrder,
    renderable: renderable(renderer, "second-row", root),
    activate: () => {},
  })

  expect(interaction.available().map((item) => item.id)).toEqual(["first-row", "second-row"])
  firstOrder = 200
  secondOrder = 100
  expect(interaction.available().map((item) => item.id)).toEqual(["second-row", "first-row"])
})

test("interaction defers hidden focus, supports direct sections, and passes return context to commands", async () => {
  const { api, renderer, dispatched } = testApi()
  const interaction = createSidebarInteraction(api)
  const host = renderable(renderer, "host")
  const outside = renderable(renderer, "outside", host)
  const root = renderable(renderer, "sidebar", host)
  ;(root as unknown as { visible: boolean }).visible = false
  interaction.setContentRoot(root)
  interaction.register({
    id: "opencode-pretty-sidebar.section.skills",
    order: 300,
    renderable: renderable(renderer, "skills", root),
    activate: () => {},
  })

  outside.focus()
  expect(interaction.focusSection("skills", outside)).toBe(false)
  expect(interaction.pendingFocus()).toBe(true)
  expect(dispatched[0].command).toBe("session.sidebar.toggle")
  ;(root as unknown as { visible: boolean }).visible = true
  expect(interaction.fulfillPendingFocus()).toBe(true)
  expect(interaction.selectedId()).toBe("opencode-pretty-sidebar.section.skills")

  const todo = renderable(renderer, "todo", root)
  interaction.register({
    id: "opencode-pretty-sidebar.section.todo",
    order: 100,
    renderable: todo,
    activate: () => {},
  })
  const direct = interaction.baseCommands().find((command) => command.name.endsWith(".focus.todo"))
  direct?.run()
  await Bun.sleep(60)
  expect(interaction.selectedId()).toBe("opencode-pretty-sidebar.section.todo")

  ;(todo as unknown as { visible: boolean }).visible = false
  interaction.focusSection("todo", outside)
  expect(interaction.selectedId()).toBe("opencode-pretty-sidebar.section.skills")

  interaction.dispatchFromReturnTarget("session.rename")
  expect(dispatched.at(-1)).toEqual({
    command: "session.rename",
    options: { focused: outside, target: outside },
  })
})

test("selection scrolls through the nearest ScrollBox ancestor", () => {
  const { api, renderer } = testApi()
  const interaction = createSidebarInteraction(api)
  const calls: string[] = []
  const scroll = {
    id: "scroll",
    parent: null,
    visible: true,
    isDestroyed: false,
    scrollChildIntoView: (id: string) => calls.push(id),
  } as unknown as Renderable
  Object.setPrototypeOf(scroll, ScrollBoxRenderable.prototype)
  const row = renderable(renderer, "row", scroll)
  interaction.register({ id: "row", order: 1, renderable: row, activate: () => {} })

  expect(interaction.select("row")).toBe(true)
  expect(calls).toEqual(["row"])
  ;(scroll as unknown as { visible: boolean }).visible = false
  expect(isEffectivelyVisible(row)).toBe(false)
})

test("shared interactive colors prioritize enabled focus, hover, and disabled muting", () => {
  const primary = {} as RGBA
  const selected = {} as RGBA
  const hover = {} as RGBA
  const panel = {} as RGBA
  const text = {} as RGBA
  const muted = {} as RGBA
  const theme = {
    primary,
    selectedListItemText: selected,
    backgroundElement: hover,
    backgroundPanel: panel,
    text,
    textMuted: muted,
  } as unknown as TuiPluginApi["theme"]["current"]

  expect(sidebarInteractiveColors(theme, { focused: true, hovered: true, disabled: false })).toEqual({
    backgroundColor: primary,
    foregroundColor: selected,
  })
  expect(sidebarInteractiveColors(theme, { focused: false, hovered: true, disabled: false })).toEqual({
    backgroundColor: hover,
    foregroundColor: text,
  })
  expect(sidebarInteractiveColors(theme, { focused: true, hovered: false, disabled: true })).toEqual({
    backgroundColor: hover,
    foregroundColor: muted,
  })
})
