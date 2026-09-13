import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { MCP_PREFERENCES_KEY } from "../src/state"
import { createMcpController } from "../src/tui"

test("reapplies enabled and disabled MCP preferences after a session change", async () => {
  let status = "connected"
  let persist = true
  let stored: unknown = { version: 1, disabledByScope: { "/repo": ["wiki"] } }
  const disconnects: Array<Record<string, unknown>> = []
  const connects: Array<Record<string, unknown>> = []
  const route = { name: "session", params: { sessionID: "session-1" } }

  const api = {
    route: { get current() { return route } },
    state: {
      path: { worktree: "/repo", directory: "/repo" },
      session: { get: () => ({ directory: "/repo", workspaceID: "workspace-1" }) },
      mcp: () => [{ name: "wiki", status }],
    },
    kv: {
      get: (key: string) => (key === MCP_PREFERENCES_KEY ? stored : undefined),
      set: (_key: string, value: unknown) => { stored = value },
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

  const controller = createMcpController(api, () => persist)
  await controller.activate()
  expect(disconnects).toEqual([{ name: "wiki", directory: "/repo", workspace: "workspace-1" }])

  status = "connected"
  route.params.sessionID = "session-2"
  await controller.activate()
  expect(disconnects).toHaveLength(2)

  await controller.toggle("wiki")
  expect(connects).toEqual([{ name: "wiki", directory: "/repo", workspace: "workspace-1" }])
  expect(stored).toEqual({ version: 2, disabledByScope: {}, enabledByScope: { "/repo": ["wiki"] } })

  status = "disabled"
  await controller.activate()
  expect(connects).toHaveLength(2)
  expect(disconnects).toHaveLength(2)

  stored = { version: 1, disabledByScope: { "/repo": ["wiki"] } }
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
    kv: {
      get: () => ({ version: 2, disabledByScope: {}, enabledByScope: {} }),
      set: () => {},
    },
    client: {
      mcp: {
        status: () =>
          Promise.resolve({ data: { context7: { status: "connected" }, wiki: { status: "disabled" } } }),
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

  await createMcpController(api, () => true).activate()
  expect(connects).toHaveLength(0)
  expect(disconnects).toHaveLength(0)
})
