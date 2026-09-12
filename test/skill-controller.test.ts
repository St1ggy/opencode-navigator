import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createSkillController } from "../src/tui"

test("loads workspace skills and inserts the selected slash command", async () => {
  const prompts: Array<Record<string, unknown>> = []
  const handlers = new Map<string, () => void>()
  const api = {
    route: { current: { name: "session", params: { sessionID: "session-1" } } },
    state: {
      path: { directory: "/repo" },
      session: { get: () => ({ directory: "/repo/app", workspaceID: "workspace-1" }) },
    },
    client: {
      app: {
        skills: () => Promise.resolve({
          data: [
            { name: "review", description: "Review code", location: "/skills/review", content: "review" },
            { name: "commit", description: "Create commits", location: "/skills/commit", content: "commit" },
          ],
        }),
      },
      tui: {
        appendPrompt: (input: Record<string, unknown>) => {
          prompts.push(input)
          return Promise.resolve({ data: true })
        },
      },
    },
    event: {
      on: (type: string, handler: () => void) => {
        handlers.set(type, handler)
        return () => handlers.delete(type)
      },
    },
    lifecycle: { onDispose: () => () => {} },
  } as unknown as TuiPluginApi

  const controller = createSkillController(api)
  const target = controller.target()
  await controller.refresh(target)
  expect(controller.list(target).map((skill) => skill.name)).toEqual(["commit", "review"])

  await controller.use(target, "review")
  expect(prompts).toEqual([{ directory: "/repo/app", workspace: "workspace-1", text: "/review " }])
  expect(handlers.has("server.connected")).toBe(true)
})
