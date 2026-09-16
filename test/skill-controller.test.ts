import { expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createSkillController } from "../src/controllers/skills"

function deferred<Value>() {
  let resolve!: (value: Value) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

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
        skills: () =>
          Promise.resolve({
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

  expect(await controller.use(target, "review")).toBe(true)
  expect(prompts).toEqual([{ directory: "/repo/app", workspace: "workspace-1", text: "/review " }])
  expect(handlers.has("server.connected")).toBe(true)
})

test("skill insertion does not report success for a rejected or superseded append", async () => {
  const response = deferred<{ data: boolean }>()
  let pending = false
  const lifecycle = new AbortController()
  const api = {
    route: { current: { name: "home" } },
    state: { path: { directory: "/repo" } },
    client: { tui: { appendPrompt: () => (pending ? response.promise : Promise.resolve({ data: false })) } },
    event: { on: () => () => {} },
    lifecycle: { signal: lifecycle.signal, onDispose() {} },
  } as unknown as TuiPluginApi
  const controller = createSkillController(api)
  const target = controller.target()
  expect(await controller.use(target, "review")).toBe(false)
  pending = true
  const request = controller.use(target, "review")
  lifecycle.abort()
  response.resolve({ data: true })
  expect(await request).toBe(false)
})

test("preserves cached skills on failure and a retry wins over a late failure", async () => {
  type Result = { data: Array<{ name: string; location: string; content: string }> }
  const responses: Array<ReturnType<typeof deferred<Result>>> = []
  const lifecycle = new AbortController()
  const api = {
    route: { current: { name: "home" } },
    state: { path: { directory: "/repo" }, session: { get: () => undefined } },
    client: {
      app: {
        skills: () => {
          const response = deferred<Result>()
          responses.push(response)
          return response.promise
        },
      },
      tui: { appendPrompt: () => Promise.resolve({ data: true }) },
    },
    event: { on: () => () => {} },
    lifecycle: { signal: lifecycle.signal, onDispose: () => () => {} },
  } as unknown as TuiPluginApi
  const controller = createSkillController(api)
  const target = controller.target()

  const initial = controller.refresh(target)
  responses[0].resolve({ data: [{ name: "cached", location: "/cached", content: "" }] })
  await initial

  const failed = controller.refresh(target, true)
  responses[1].reject(new Error("skills unavailable"))
  await expect(failed).rejects.toThrow("skills unavailable")
  expect(controller.list(target).map((skill) => skill.name)).toEqual(["cached"])
  expect(controller.state(target)).toMatchObject({
    status: "error",
    error: { operation: "refresh skills", target: target.key, message: "skills unavailable", retryable: true },
  })

  const retried = controller.retry(target)
  responses[2].resolve({ data: [{ name: "retried", location: "/retried", content: "" }] })
  await retried
  expect(controller.list(target).map((skill) => skill.name)).toEqual(["retried"])

  const stale = controller.refresh(target, true)
  const latest = controller.retry(target)
  responses[3].reject(new Error("late failure"))
  responses[4].resolve({ data: [{ name: "latest", location: "/latest", content: "" }] })
  await expect(stale).rejects.toThrow("late failure")
  await latest

  expect(controller.list(target).map((skill) => skill.name)).toEqual(["latest"])
  expect(controller.state(target).status).toBe("ready")
  expect(controller.state(target).error).toBeUndefined()
})
