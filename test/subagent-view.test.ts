import { expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import {
  buildSubagentView,
  createSubagentClock,
  formatSubagentDuration,
  type SubagentViewItem,
} from "../src/subagent-view"

test("subagent duration formats observed, approximate, frozen, and negative values", () => {
  expect(formatSubagentDuration(0, 12_999)).toBe("12s")
  expect(formatSubagentDuration(0, 123_000, true)).toBe("≥2m 03s")
  expect(formatSubagentDuration(0, 3_720_000)).toBe("1h 02m")
  expect(formatSubagentDuration(100, 0)).toBe("0s")
})

test("subagent view prioritizes attention and keeps recent behind active", () => {
  const item = (id: string, status: SubagentViewItem["status"], finishedAt?: number): SubagentViewItem => ({
    session: { id } as SubagentViewItem["session"],
    status,
    run: { sessionID: id, startedAt: 0, finishedAt, startedBeforeObservation: false },
  })
  const active = [
    item("busy", { type: "busy" }),
    item("retry", { type: "retry", attempt: 1, next: 0, message: "retry" }),
    { ...item("error", { type: "busy" }), unavailable: true },
  ]
  const recent = [item("old", { type: "idle" }, 1), item("new", { type: "idle" }, 2)]
  expect(buildSubagentView(active, recent).map((row) => row.session.id)).toEqual([
    "error",
    "retry",
    "busy",
    "new",
    "old",
  ])
})

test("subagent clock stops when hidden and on disposal", async () => {
  let dispose!: () => void
  const [key, setKey] = createSignal<string | undefined>("parent")
  const now = createRoot((cleanup) => {
    dispose = cleanup
    return createSubagentClock(key)
  })
  const initial = now()
  await Bun.sleep(1100)
  expect(now()).toBeGreaterThan(initial)
  setKey(undefined)
  const paused = now()
  await Bun.sleep(1100)
  expect(now()).toBe(paused)
  setKey("other")
  expect(now()).toBeGreaterThan(paused)
  dispose()
  const stopped = now()
  await Bun.sleep(1100)
  expect(now()).toBe(stopped)
})
