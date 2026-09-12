import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createTodoController } from "../src/tui"

test("a stale refresh does not overwrite a newer todo event", async () => {
  let resolveRequest!: (value: { data: Array<{ content: string; status: string; priority: string }> }) => void
  const request = new Promise<{ data: Array<{ content: string; status: string; priority: string }> }>((resolve) => {
    resolveRequest = resolve
  })
  let onTodoUpdated!: (event: {
    properties: { sessionID: string; todos: Array<{ content: string; status: string; priority: string }> }
  }) => void

  const api = {
    state: {
      path: { worktree: "/repo", directory: "/repo" },
      session: { todo: () => [] },
    },
    client: { session: { todo: () => request } },
    event: {
      on: (_type: string, handler: typeof onTodoUpdated) => {
        onTodoUpdated = handler
        return () => {}
      },
    },
    lifecycle: { onDispose: () => () => {} },
    kv: { get: () => undefined, set: () => {}, ready: true },
  } as unknown as TuiPluginApi

  const controller = createTodoController(api)
  const refreshing = controller.refresh("session-1")
  onTodoUpdated({
    properties: {
      sessionID: "session-1",
      todos: [{ content: "new", status: "pending", priority: "high" }],
    },
  })
  resolveRequest({ data: [{ content: "old", status: "pending", priority: "low" }] })
  await refreshing

  expect(controller.list("session-1").map((item) => item.content)).toEqual(["new"])
})
