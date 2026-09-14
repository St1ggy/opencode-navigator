import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"

test("the built plugin registers its lifecycle and sidebar slots", async () => {
  // @ts-expect-error The package intentionally publishes JavaScript without declarations.
  const { default: plugin } = await import("../dist/tui.js")
  const disposers: Array<() => void | Promise<void>> = []
  const subscriptions: string[] = []
  const rendererSubscriptions: string[] = []
  let registration: { order: number; slots: Record<string, unknown> } | undefined
  const api = {
    state: { path: { state: "/tmp/opencode-pretty-sidebar-test" } },
    event: {
      on(name: string) {
        subscriptions.push(name)
        return () => {}
      },
    },
    lifecycle: {
      onDispose(dispose: () => void | Promise<void>) {
        disposers.push(dispose)
      },
    },
    renderer: {
      currentFocusedRenderable: null,
      on(name: string) {
        rendererSubscriptions.push(name)
      },
      off() {},
    },
    slots: {
      register(value: typeof registration) {
        registration = value
      },
    },
  } as unknown as TuiPluginApi

  await plugin.tui(api, {})

  expect(subscriptions).toEqual([
    "todo.updated",
    "session.created",
    "session.updated",
    "session.deleted",
    "session.status",
    "session.idle",
    "server.connected",
    "server.connected",
    "mcp.tools.changed",
    "server.connected",
  ])
  expect(rendererSubscriptions).toEqual(["focused_renderable"])
  expect(registration?.order).toBe(100)
  expect(Object.keys(registration?.slots ?? {})).toEqual(["app", "sidebar_title", "sidebar_content"])
  expect(disposers.length).toBeGreaterThan(0)
})
