import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

import type { SubagentRun } from './history'
import type { Session, SessionStatus } from '@opencode-ai/sdk/v2'

export type SubagentViewItem = { session: Session; status: SessionStatus; run?: SubagentRun; unavailable?: boolean }
export type SubagentViewMode = 'all' | 'active' | 'recent' | 'errors'

export function filterSubagentView(rows: ReturnType<typeof buildSubagentView>, mode: SubagentViewMode, query: string) {
  const needle = query.trim().toLocaleLowerCase()

  return rows.filter((row) => {
    if (mode === 'active' && row.group !== 'Active') return false

    if (mode === 'recent' && row.group !== 'Recent') return false

    if (mode === 'errors' && row.run?.outcome !== 'error' && !row.unavailable) return false

    return (
      !needle ||
      [row.session.title, row.session.id, row.run?.errorMessage].some((value) =>
        value?.toLocaleLowerCase().includes(needle),
      )
    )
  })
}

export function countSubagentView(rows: ReturnType<typeof buildSubagentView>, query: string) {
  return {
    all: filterSubagentView(rows, 'all', query).length,
    active: filterSubagentView(rows, 'active', query).length,
    recent: filterSubagentView(rows, 'recent', query).length,
    errors: filterSubagentView(rows, 'errors', query).length,
  } satisfies Record<SubagentViewMode, number>
}

export function buildSubagentView(active: readonly SubagentViewItem[], recent: readonly SubagentViewItem[]) {
  const priority = (item: SubagentViewItem) => {
    if (item.run?.errorMessage || item.unavailable) return 0

    return item.status.type === 'retry' ? 1 : 2
  }

  return [
    ...[...active].sort((a, b) => priority(a) - priority(b)).map((item) => ({ ...item, group: 'Active' as const })),
    ...[...recent]
      .sort((a, b) => (b.run?.finishedAt ?? 0) - (a.run?.finishedAt ?? 0) || a.session.id.localeCompare(b.session.id))
      .map((item) => ({ ...item, group: 'Recent' as const })),
  ]
}

export function formatSubagentDuration(startedAt: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  let value = `${seconds}s`

  if (seconds >= 3600)
    value = `${Math.floor(seconds / 3600)}h ${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}m`
  else if (seconds >= 60) value = `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`

  return value
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
