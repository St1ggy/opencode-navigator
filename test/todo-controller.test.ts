import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createTodoController } from "../src/controllers/todo"

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
      session: { get: () => undefined, todo: () => [] },
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

test("routes todo requests by their immutable session target and ignores late route success", async () => {
  const requests: Array<{
    input: Record<string, unknown>
    resolve: (value: { data: Array<{ content: string; status: string }> }) => void
  }> = []
  let directory = "/repo/a"
  const api = {
    state: {
      path: { directory: "/repo" },
      session: {
        get: () => ({ directory, workspaceID: directory.endsWith("a") ? "workspace-a" : "workspace-b" }),
        todo: () => [],
      },
    },
    client: {
      session: {
        todo: (input: Record<string, unknown>) =>
          new Promise<{ data: Array<{ content: string; status: string }> }>((resolve) => {
            requests.push({ input, resolve })
          }),
      },
    },
    event: { on: () => () => {} },
    lifecycle: { signal: new AbortController().signal, onDispose: () => () => {} },
  } as unknown as TuiPluginApi
  const controller = createTodoController(api)

  const first = controller.refresh("session-1")
  directory = "/repo/b"
  const second = controller.refresh("session-1")
  requests[1].resolve({ data: [{ content: "workspace B", status: "pending" }] })
  await second
  requests[0].resolve({ data: [{ content: "workspace A", status: "pending" }] })
  await first

  expect(requests.map((request) => request.input)).toEqual([
    { sessionID: "session-1", directory: "/repo/a", workspace: "workspace-a" },
    { sessionID: "session-1", directory: "/repo/b", workspace: "workspace-b" },
  ])
  expect(controller.list("session-1").map((item) => item.content)).toEqual(["workspace B"])
})

test("aborts a todo request on disposal without exposing an error", async () => {
  const lifecycle = new AbortController()
  let requestSignal: AbortSignal | undefined
  const api = {
    state: {
      path: { directory: "/repo" },
      session: { get: () => undefined, todo: () => [] },
    },
    client: {
      session: {
        todo: (_input: unknown, options: { signal: AbortSignal }) => {
          requestSignal = options.signal
          return new Promise((_resolve, reject) => {
            options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
          })
        },
      },
    },
    event: { on: () => () => {} },
    lifecycle: { signal: lifecycle.signal, onDispose: () => () => {} },
  } as unknown as TuiPluginApi
  const controller = createTodoController(api)

  const refresh = controller.refresh("session-1")
  lifecycle.abort()
  await expect(refresh).rejects.toMatchObject({ name: "AbortError" })

  expect(requestSignal?.aborted).toBe(true)
  expect(controller.state("session-1")).toEqual({ status: "idle" })
})

test("changing the active todo context eagerly invalidates an abort-ignoring request", async () => {
  let resolveOld!: (value: { data: Array<{ content: string; status: "pending" }> }) => void
  let oldSignal: AbortSignal | undefined
  const api = {
    state: {
      path: { directory: "/repo" },
      session: { get: () => undefined, todo: () => [] },
    },
    client: {
      session: {
        todo: ({ sessionID }: { sessionID: string }, options: { signal: AbortSignal }) => {
          if (sessionID !== "old") return Promise.resolve({ data: [] })
          oldSignal = options.signal
          return new Promise<{ data: Array<{ content: string; status: "pending" }> }>((resolve) => {
            resolveOld = resolve
          })
        },
      },
    },
    event: { on: () => () => {} },
    lifecycle: { signal: new AbortController().signal, onDispose: () => () => {} },
  } as unknown as TuiPluginApi
  const controller = createTodoController(api)

  controller.activate("old")
  const request = controller.refresh("old")
  controller.activate("new")
  expect(oldSignal?.aborted).toBe(true)
  expect(controller.state("old")).toEqual({ status: "idle" })

  resolveOld({ data: [{ content: "stale", status: "pending" }] })
  await request
  expect(controller.list("old")).toEqual([])
})
