import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { MCP_PREFERENCES_KEY } from "../src/state"
import { createMcpController } from "../src/tui"

test("reapplies MCP preferences after a session change and lets a manual connect win", async () => {
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
  expect(stored).toEqual({ version: 1, disabledByScope: {} })

  await controller.activate()
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
