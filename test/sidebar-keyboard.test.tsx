/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BoxRenderable } from "@opentui/core"
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui"
import { testRender, useRenderer } from "@opentui/solid"
import { createSignal, onCleanup } from "solid-js"
import { SectionFilter, useSidebarItem } from "../src/components/common"
import { SidebarFocusBinding } from "../src/components/sidebar"
import type { PreferencesController } from "../src/controllers/preferences"
import { createSidebarInteraction, type SidebarInteraction } from "../src/sidebar-interaction"

const theme = {
  primary: "#7aa2f7",
  selectedListItemText: "#16161e",
  backgroundElement: "#292e42",
  backgroundPanel: "#16161e",
  text: "#c0caf5",
  textMuted: "#a9b1d6",
  accent: "#ff9e64",
}

test("focus shortcut registration follows runtime replacement and direct commands have no bindings", async () => {
  const [focusKey, setFocusKey] = createSignal("ctrl+shift+f")
  const layers: Array<{ bindings?: Array<{ key: string }>; commands?: Array<{ name: string }> }> = []
  const disposed: string[] = []
  const api = {
    route: { current: { name: "session" } },
    renderer: { currentFocusedRenderable: null, on: () => {}, off: () => {} },
    keymap: {
      registerLayer(layer: (typeof layers)[number]) {
        layers.push(layer)
        return () => {
          const key = layer.bindings?.[0]?.key
          if (key) disposed.push(key)
        }
      },
      dispatchCommand: () => ({ ok: true }),
    },
    ui: { dialog: { replace: () => {}, setSize: () => {} } },
  } as unknown as TuiPluginApi
  const interaction = createSidebarInteraction(api)
  const setup = await testRender(
    () => (
      <SidebarFocusBinding
        api={api}
        preferences={{ focusKey } as unknown as PreferencesController}
        interaction={interaction}
      />
    ),
    { width: 1, height: 1 },
  )

  try {
    await setup.renderOnce()
    expect(layers.flatMap((layer) => layer.bindings ?? []).map((binding) => binding.key)).toEqual(["ctrl+shift+f"])
    expect(layers[0].commands?.map((command) => command.name)).toContain("opencode-pretty-sidebar.focus.skills")
    expect(layers[0].bindings).toBeUndefined()

    setFocusKey("alt+f")
    await setup.renderOnce()
    expect(layers.flatMap((layer) => layer.bindings ?? []).map((binding) => binding.key)).toEqual([
      "ctrl+shift+f",
      "alt+f",
    ])
    expect(disposed).toEqual(["ctrl+shift+f"])
  } finally {
    setup.renderer.destroy()
  }
})

test("real key input wraps arrows and j/k, activates, isolates other focus, and selects before mouse activation", async () => {
  let interaction!: SidebarInteraction
  let modal: BoxRenderable | undefined
  const activated: string[] = []

  function Row(props: { id: string; order: number; disabled?: boolean }) {
    const item = useSidebarItem(api, interaction, {
      id: props.id,
      order: props.order,
      disabled: () => props.disabled === true,
      activate: () => activated.push(`${props.id}:${interaction.selectedId()}`),
    })
    return (
      <box
        ref={(node: BoxRenderable) => item.ref(node)}
        id={props.id}
        height={1}
        backgroundColor={item.backgroundColor()}
        onMouseDown={(event) => item.activate(event)}
      >
        <text fg={item.foregroundColor()}>{props.id}</text>
      </box>
    )
  }

  let api!: TuiPluginApi
  function Harness() {
    const renderer = useRenderer()
    api = {
      renderer,
      keymap: createDefaultOpenTuiKeymap(renderer),
      route: { current: { name: "session", params: { sessionID: "session" } } },
      theme: { current: theme },
      ui: { dialog: { replace: () => {}, setSize: () => {} } },
    } as unknown as TuiPluginApi
    interaction = createSidebarInteraction(api)
    onCleanup(() => interaction.dispose())
    return (
      <box>
        <box
          ref={(node: BoxRenderable) => interaction.setContentRoot(node)}
          focusable
          onKeyDown={(event) => {
            if (event.name === "escape" && !event.defaultPrevented) interaction.leave()
          }}
        >
          <Row id="a" order={1} />
          <Row id="b" order={2} />
          <Row id="disabled" order={3} disabled />
        </box>
        <box ref={(node: BoxRenderable) => (modal = node)} focusable>
          <text>modal</text>
        </box>
      </box>
    )
  }

  const setup = await testRender(() => <Harness />, { width: 30, height: 5 })
  try {
    await setup.flush()
    await Promise.resolve()
    interaction.focus(null)
    expect(interaction.selectedId()).toBe("a")
    setup.mockInput.pressArrow("up")
    expect(interaction.selectedId()).toBe("disabled")
    setup.mockInput.pressKey("j")
    expect(interaction.selectedId()).toBe("a")
    setup.mockInput.pressKey("k")
    expect(interaction.selectedId()).toBe("disabled")
    setup.mockInput.pressEnter()
    expect(activated).toEqual([])
    setup.mockInput.pressArrow("up")
    setup.mockInput.pressEnter()
    expect(activated).toEqual(["b:b"])

    modal?.focus()
    await setup.flush()
    expect(interaction.ownsFocus()).toBe(false)
    setup.mockInput.pressArrow("down")
    expect(interaction.selectedId()).toBe("b")

    await setup.mockMouse.pressDown(0, 0)
    expect(activated.at(-1)).toBe("a:a")
  } finally {
    setup.renderer.destroy()
  }
})

test("filter enter takes real focus, j/k type, and two escapes return then leave", async () => {
  let interaction!: SidebarInteraction
  let root: BoxRenderable | undefined
  let api!: TuiPluginApi
  const [query, setQuery] = createSignal("")

  function Harness() {
    const renderer = useRenderer()
    api = {
      renderer,
      keymap: createDefaultOpenTuiKeymap(renderer),
      route: { current: { name: "session", params: { sessionID: "session" } } },
      theme: { current: theme },
      ui: { dialog: { replace: () => {}, setSize: () => {} } },
    } as unknown as TuiPluginApi
    interaction = createSidebarInteraction(api)
    onCleanup(() => interaction.dispose())
    return (
      <box
        ref={(node: BoxRenderable) => {
          root = node
          interaction.setContentRoot(node)
        }}
        focusable
        onKeyDown={(event) => {
          if (event.name === "escape" && !event.defaultPrevented) interaction.leave()
        }}
      >
        <SectionFilter
          api={api}
          interaction={interaction}
          id="filter"
          order={1}
          query={query()}
          placeholder="Filter..."
          onInput={setQuery}
        />
      </box>
    )
  }

  const setup = await testRender(() => <Harness />, { width: 30, height: 2 })
  try {
    await setup.flush()
    await Promise.resolve()
    interaction.focus(null)
    setup.mockInput.pressEnter()
    expect(api.renderer.currentFocusedRenderable?.id).not.toBe(root?.id)
    await setup.mockInput.typeText("jk")
    expect(query()).toBe("jk")
    expect(interaction.selectedId()).toBe("filter")

    setup.mockInput.pressEscape()
    await setup.flush()
    expect(api.renderer.currentFocusedRenderable?.id).toBe(root?.id)
    setup.mockInput.pressEscape()
    await Bun.sleep(60)
    await setup.flush()
    expect(api.renderer.currentFocusedRenderable).toBeNull()
  } finally {
    setup.renderer.destroy()
  }
})
