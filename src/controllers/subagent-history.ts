import { createSignal } from 'solid-js'

import type { EventSessionError, SessionStatus } from '@opencode-ai/sdk/v2'

export type SubagentRun = {
  sessionID: string
  startedAt: number
  finishedAt?: number
  outcome?: 'finished' | 'error' | 'cancelled'
  errorMessage?: string
  startedBeforeObservation: boolean
}
export type SubagentError = NonNullable<EventSessionError['properties']['error']>

export function createSubagentHistory({ now = Date.now }: { now?: () => number } = {}) {
  const targets = new Map<string, { known: Set<string>; active: Map<string, SubagentRun>; recent: SubagentRun[] }>()
  const [revision, setRevision] = createSignal(0)

  function state(key: string) {
    let value = targets.get(key)

    if (!value) {
      value = { known: new Set(), active: new Map(), recent: [] }
      targets.set(key, value)
    }

    return value
  }
  function changed() {
    setRevision((value) => value + 1)
  }

  return {
    observeStatus(key: string, sessionID: string, status: SessionStatus, at = now()) {
      const value = state(key)
      const run = value.active.get(sessionID)
      const isKnown = value.known.has(sessionID)

      value.known.add(sessionID)

      if (status.type === 'idle') {
        if (!run) return

        value.active.delete(sessionID)
        value.recent = [
          { ...run, finishedAt: Math.max(at, run.startedAt), outcome: run.outcome ?? 'finished' },
          ...value.recent,
        ]
          .sort((a, b) => b.finishedAt! - a.finishedAt! || a.sessionID.localeCompare(b.sessionID))
          .slice(0, 10)
      } else {
        if (run) return

        value.recent = value.recent.filter((item) => item.sessionID !== sessionID)
        value.active.set(sessionID, { sessionID, startedAt: at, startedBeforeObservation: !isKnown })
      }

      changed()
    },
    observeError(key: string, sessionID: string | undefined, error?: SubagentError, at = now()) {
      if (!sessionID) return

      const value = state(key)
      const run = value.active.get(sessionID) ?? value.recent.find((item) => item.sessionID === sessionID)

      if (!run || (at < run.startedAt && !run.startedBeforeObservation)) return

      const isCancelled = error?.name === 'MessageAbortedError'
      const data = error && 'data' in error ? error.data : undefined
      const fallbackMessage = isCancelled ? 'Session aborted' : 'Session error'
      const message = data && 'message' in data && typeof data.message === 'string' ? data.message : fallbackMessage
      const next: SubagentRun = {
        ...run,
        startedAt: Math.min(run.startedAt, at),
        outcome: isCancelled ? 'cancelled' : 'error',
        errorMessage: message,
      }

      if (value.active.has(sessionID)) value.active.set(sessionID, next)
      else value.recent = value.recent.map((item) => (item.sessionID === sessionID ? next : item))

      changed()
    },
    remove(key: string, sessionID: string) {
      const value = targets.get(key)

      if (!value) return

      value.known.delete(sessionID)
      value.active.delete(sessionID)
      value.recent = value.recent.filter((item) => item.sessionID !== sessionID)
      changed()
    },
    active(key: string, sessionID: string) {
      revision()

      return targets.get(key)?.active.get(sessionID)
    },
    recent(key: string): readonly SubagentRun[] {
      revision()

      return targets.get(key)?.recent ?? []
    },
  }
}
