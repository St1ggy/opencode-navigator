import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { Session, SessionStatus } from "@opencode-ai/sdk/v2"
import { createSubagentController } from "../src/tui"

function session(id: string, parentID: string, created: number): Session {
  return {
    id,
    slug: id,
    projectID: "project-1",
    directory: "/repo",
    parentID,
    title: `${id} task`,
    version: "1.18.30",
    time: { created, updated: created },
  }
}

test("keeps active subagent events received during refresh and opens a child session", async () => {
  let resolveChildren!: (value: { data: Session[] }) => void
  let resolveStatuses!: (value: { data: Record<string, SessionStatus> }) => void
  const childrenRequest = new Promise<{ data: Session[] }>((resolve) => {
    resolveChildren = resolve
  })
  const statusRequest = new Promise<{ data: Record<string, SessionStatus> }>((resolve) => {
    resolveStatuses = resolve
  })
  const handlers = new Map<string, (event: any) => void>()
  const navigations: Array<{ name: string; params?: Record<string, unknown> }> = []

  const api = {
    state: {
      path: { directory: "/repo" },
      session: {
        get: () => ({ directory: "/repo" }),
        status: () => undefined,
      },
    },
    client: {
      session: {
        children: () => childrenRequest,
        status: () => statusRequest,
      },
    },
    event: {
      on: (type: string, handler: (event: any) => void) => {
        handlers.set(type, handler)
        return () => handlers.delete(type)
      },
    },
    lifecycle: { onDispose: () => () => {} },
    route: {
      navigate: (name: string, params?: Record<string, unknown>) => navigations.push({ name, params }),
    },
  } as unknown as TuiPluginApi

  const controller = createSubagentController(api)
  const refreshing = controller.refresh("parent-1")
  const recent = session("recent", "parent-1", 2)
  handlers.get("session.created")?.({ properties: { sessionID: recent.id, info: recent } })
  handlers.get("session.status")?.({ properties: { sessionID: recent.id, status: { type: "retry", attempt: 1, message: "retrying", next: 0 } } })

  const existing = session("existing", "parent-1", 1)
  resolveChildren({ data: [existing] })
  resolveStatuses({ data: { existing: { type: "busy" } } })
  await refreshing

  expect(controller.list("parent-1").map((item) => [item.session.id, item.status.type])).toEqual([
    ["existing", "busy"],
    ["recent", "retry"],
  ])

  handlers.get("session.status")?.({ properties: { sessionID: recent.id, status: { type: "idle" } } })
  expect(controller.list("parent-1").map((item) => item.session.id)).toEqual(["existing"])

  controller.open(existing.id)
  expect(navigations).toEqual([{ name: "session", params: { sessionID: "existing" } }])
})
