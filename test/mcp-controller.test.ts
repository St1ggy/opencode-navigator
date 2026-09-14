import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMcpController } from "../src/controllers/mcp"
import type { DesiredMcpState } from "../src/preferences-schema"

function deferred<Value>() {
  let resolve!: (value: Value) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function preferences(initial: Record<string, DesiredMcpState> = {}) {
  let values = { ...initial }
  return {
    access: {
      load: async () => {},
      desiredMcpState: (_scope: string, name: string) => values[name],
      setDesiredMcpState: (_scope: string, name: string, state: DesiredMcpState) => {
        values = { ...values, [name]: state }
      },
    },
    values: () => values,
  }
}

test("reapplies enabled and disabled MCP preferences after a session change", async () => {
  let status = "connected"
  let persist = true
  const saved = preferences({ wiki: "disabled" })
  const disconnects: Array<Record<string, unknown>> = []
  const connects: Array<Record<string, unknown>> = []
  const route = { name: "session", params: { sessionID: "session-1" } }

  const api = {
    route: {
      get current() {
        return route
      },
    },
    state: {
      path: { worktree: "/repo", directory: "/repo" },
      session: { get: () => ({ directory: "/repo", workspaceID: "workspace-1" }) },
      mcp: () => [{ name: "wiki", status }],
    },
    client: {
      mcp: {
        status: () => Promise.resolve({ data: { wiki: { status } } }),
        disconnect: (input: Record<string, unknown>) => {
          disconnects.push(input)
          status = "disabled"
          return Promise.resolve({ data: true })
        },
        connect: (input: Record<string, unknown>) => {
          connects.push(input)
          status = "connected"
          return Promise.resolve({ data: true })
        },
      },
    },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi

  const controller = createMcpController(api, () => persist, saved.access)
  await controller.activate()
  expect(disconnects).toEqual([{ name: "wiki", directory: "/repo", workspace: "workspace-1" }])

  status = "connected"
  route.params.sessionID = "session-2"
  await controller.activate()
  expect(disconnects).toHaveLength(2)

  await controller.toggle("wiki")
  expect(connects).toEqual([{ name: "wiki", directory: "/repo", workspace: "workspace-1" }])
  expect(saved.values()).toEqual({ wiki: "enabled" })

  status = "disabled"
  await controller.activate()
  expect(connects).toHaveLength(2)
  expect(disconnects).toHaveLength(2)

  saved.access.setDesiredMcpState("/repo", "wiki", "disabled")
  status = "connected"
  persist = false
  await controller.activate()
  expect(disconnects).toHaveLength(2)

  persist = true
  await controller.activate()
  expect(disconnects).toHaveLength(3)
})

test("leaves MCP servers without a saved state unchanged", async () => {
  const connects: unknown[] = []
  const disconnects: unknown[] = []
  const api = {
    route: { current: { name: "home" } },
    state: {
      path: { worktree: "/repo", directory: "/repo" },
      mcp: () => [],
    },
    client: {
      mcp: {
        status: () => Promise.resolve({ data: { context7: { status: "connected" }, wiki: { status: "disabled" } } }),
        connect: (...args: unknown[]) => {
          connects.push(args)
          return Promise.resolve({ data: true })
        },
        disconnect: (...args: unknown[]) => {
          disconnects.push(args)
          return Promise.resolve({ data: true })
        },
      },
    },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi

  await createMcpController(api, () => true, preferences().access).activate()
  expect(connects).toHaveLength(0)
  expect(disconnects).toHaveLength(0)
})

test("waits for preference hydration before applying MCP state", async () => {
  let hydrate: (() => void) | undefined
  let hydrated = false
  const disconnects: unknown[] = []
  const api = {
    route: { current: { name: "home" } },
    state: { path: { worktree: "/repo" }, mcp: () => [] },
    client: {
      mcp: {
        status: () => Promise.resolve({ data: { wiki: { status: "connected" } } }),
        disconnect: (...args: unknown[]) => {
          disconnects.push(args)
          return Promise.resolve({ data: true })
        },
        connect: () => Promise.resolve({ data: true }),
      },
    },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi
  const access = {
    load: () =>
      new Promise<void>((resolve) => {
        hydrate = () => {
          hydrated = true
          resolve()
        }
      }),
    desiredMcpState: () => (hydrated ? ("disabled" as const) : undefined),
    setDesiredMcpState: () => {},
  }

  const activation = createMcpController(api, () => true, access).activate()
  await Promise.resolve()
  expect(disconnects).toHaveLength(0)
  hydrate?.()
  await activation
  expect(disconnects).toHaveLength(1)
})

test("records a toggle synchronously before starting the MCP mutation", async () => {
  const order: string[] = []
  const api = {
    route: { current: { name: "home" } },
    state: {
      path: { worktree: "/repo" },
      mcp: () => [{ name: "wiki", status: "connected" }],
    },
    client: {
      mcp: {
        status: () => Promise.resolve({ data: { wiki: { status: "disabled" } } }),
        disconnect: () => {
          order.push("disconnect")
          return Promise.resolve({ data: true })
        },
        connect: () => Promise.resolve({ data: true }),
      },
    },
    ui: { toast: () => {} },
  } as unknown as TuiPluginApi
  const access = {
    load: async () => {},
    desiredMcpState: () => undefined,
    setDesiredMcpState: () => order.push("desired"),
  }

  await createMcpController(api, () => true, access).toggle("wiki")
  expect(order).toEqual(["desired", "disconnect"])
})

test("keeps a newer MCP route ready when an older route fails late", async () => {
  type Result = { data: Record<string, { status: "connected" }> }
  const responses: Array<ReturnType<typeof deferred<Result>>> = []
  const route = { name: "session", params: { sessionID: "session-a" } }
  const api = {
    route: { current: route },
    state: {
      path: { worktree: "/repo", directory: "/repo" },
      session: {
        get: (sessionID: string) => ({ directory: `/repo/${sessionID}`, workspaceID: `workspace-${sessionID}` }),
      },
      mcp: () => [],
    },
    client: {
      mcp: {
        status: () => {
          const response = deferred<Result>()
          responses.push(response)
          return response.promise
        },
      },
    },
    lifecycle: { signal: new AbortController().signal },
  } as unknown as TuiPluginApi
  const controller = createMcpController(api, () => false, preferences().access)

  const first = controller.refresh()
  route.params.sessionID = "session-b"
  const secondTarget = controller.target()
  const second = controller.refresh(secondTarget)
  responses[1].resolve({ data: { current: { status: "connected" } } })
  await second
  responses[0].reject(new Error("late workspace failure"))
  await expect(first).rejects.toThrow("late workspace failure")

  expect(controller.list().map((item) => item.name)).toEqual(["current"])
  expect(controller.state().status).toBe("ready")
  expect(controller.state().error).toBeUndefined()
})

test("tracks failed MCP mutations per server and retries the failed operation", async () => {
  let status = "connected"
  let fail = true
  const api = {
    route: { current: { name: "home" } },
    state: {
      path: { worktree: "/repo", directory: "/repo" },
      mcp: () => [{ name: "wiki", status }],
    },
    client: {
      mcp: {
        status: () => Promise.resolve({ data: { wiki: { status } } }),
        disconnect: () => {
          if (fail) return Promise.reject(new Error("disconnect failed"))
          status = "disabled"
          return Promise.resolve({ data: true })
        },
        connect: () => Promise.resolve({ data: true }),
      },
    },
    ui: { toast: () => {} },
    lifecycle: { signal: new AbortController().signal },
  } as unknown as TuiPluginApi
  const controller = createMcpController(api, () => true, preferences().access)

  await controller.refresh()
  await expect(controller.toggle("wiki")).rejects.toThrow("disconnect failed")
  expect(controller.list()).toEqual([{ name: "wiki", status: "connected" }])
  expect(controller.serverState("wiki")).toMatchObject({
    status: "error",
    error: { operation: "disconnect MCP server", message: "disconnect failed", retryable: true },
  })

  fail = false
  await controller.retryServer("wiki")
  expect(controller.serverState("wiki").status).toBe("ready")
  expect(controller.list()).toEqual([{ name: "wiki", status: "disabled", error: undefined }])
})

test("reports every MCP server whose saved state restoration failed", async () => {
  const toasts: Array<{ message: string }> = []
  const api = {
    route: { current: { name: "home" } },
    state: {
      path: { worktree: "/repo", directory: "/repo" },
      mcp: () => [],
    },
    client: {
      mcp: {
        status: () => Promise.resolve({ data: { wiki: { status: "connected" }, tracker: { status: "connected" } } }),
        disconnect: ({ name }: { name: string }) => Promise.reject(new Error(`${name} unavailable`)),
        connect: () => Promise.resolve({ data: true }),
      },
    },
    ui: { toast: (toast: { message: string }) => toasts.push(toast) },
    lifecycle: { signal: new AbortController().signal },
  } as unknown as TuiPluginApi
  const saved = preferences({ wiki: "disabled", tracker: "disabled" })

  await createMcpController(api, () => true, saved.access).activate()

  expect(toasts.map((toast) => toast.message)).toEqual(["Could not restore: tracker, wiki"])
})
