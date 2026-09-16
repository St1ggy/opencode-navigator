import type { Session, SessionStatus } from "@opencode-ai/sdk/v2"
import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js"
import type { SubagentRun } from "./controllers/subagent-history"

export type SubagentViewItem = { session: Session; status: SessionStatus; run?: SubagentRun; unavailable?: boolean }

export function buildSubagentView(active: ReadonlyArray<SubagentViewItem>, recent: ReadonlyArray<SubagentViewItem>) {
  const priority = (item: SubagentViewItem) =>
    item.run?.errorMessage || item.unavailable ? 0 : item.status.type === "retry" ? 1 : 2
  return [
    ...[...active].sort((a, b) => priority(a) - priority(b)).map((item) => ({ ...item, group: "Active" as const })),
    ...[...recent]
      .sort((a, b) => (b.run?.finishedAt ?? 0) - (a.run?.finishedAt ?? 0) || a.session.id.localeCompare(b.session.id))
      .map((item) => ({ ...item, group: "Recent" as const })),
  ]
}

export function formatSubagentDuration(startedAt: number, now: number, approximate = false) {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  const value =
    seconds < 60
      ? `${seconds}s`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`
        : `${Math.floor(seconds / 3600)}h ${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}m`
  return `${approximate ? "≥" : ""}${value}`
}

export function createSubagentClock(key: Accessor<string | undefined>) {
  const [now, setNow] = createSignal(Date.now())
  createEffect(() => {
    if (key() === undefined) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    onCleanup(() => clearInterval(timer))
  })
  return now
}
