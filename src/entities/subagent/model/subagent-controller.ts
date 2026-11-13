import { batch, createSignal } from 'solid-js'

import { createRequestState, retryBackgroundRefresh } from '../../../shared/lib/request-state'

import { type SubagentError, createSubagentHistory } from './history'

import type { Lifecycle } from '../../../shared/lib/lifecycle'
import type { RemoteSubagentStatus, SubagentEvent, SubagentSource, SubagentTarget } from './source'
import type { SubagentSession as Session, SubagentStatus as SessionStatus } from './types'

type SessionMutation = { type: 'upsert'; info: Session } | { type: 'remove'; sessionID: string }
type StatusMutation = {
  sessionID: string
  status: SessionStatus
  at: number
  startedAt?: number
  observed: Set<string>
}
type ErrorMutation = { sessionID: string; error?: SubagentError; at: number; observed: Set<string> }
const POLL_INTERVAL_MS = 5000

function activeStatus(status: SessionStatus | undefined): status is Extract<SessionStatus, { type: 'busy' | 'retry' }> {
  return status?.type === 'busy' || status?.type === 'retry'
}

export function createSubagentModel(options: {
  lifecycle: Lifecycle
  target(parentID: string): SubagentTarget
  source: SubagentSource
  cache: 'source' | 'model'
  snapshot(
    target: SubagentTarget,
    signal: AbortSignal,
  ): Promise<{
    sessions: readonly Session[]
    statuses: Record<string, SessionStatus>
  }>
  remoteStatus?(session: Session, signal: AbortSignal): Promise<RemoteSubagentStatus | undefined>
  subscribe(listener: (event: SubagentEvent) => void): () => void
  open(sessionID: string): void
  now?: () => number
}) {
  const source = options.source
  const now = options.now ?? Date.now
  const history = createSubagentHistory({ now })
  const [children, setChildren] = createSignal<Record<string, readonly Session[]>>({})
  const [statuses, setStatuses] = createSignal<Record<string, Record<string, SessionStatus>>>({})
  const refreshing = new Map<string, Promise<void>>()
  const journals = new Set<{ sessions: SessionMutation[]; statuses: StatusMutation[]; errors: ErrorMutation[] }>()
  const [unavailable, setUnavailable] = createSignal<Record<string, Record<string, boolean>>>({})
  const targets = new Map<string, SubagentTarget>()
  const remoteFailures = new Map<string, number>()
  const remoteRetryAt = new Map<string, number>()
  const requests = createRequestState(options.lifecycle.signal)
  let activeTarget: string | undefined
  let leases = new Set<symbol>()
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  const snapshots = () =>
    options.cache === 'source'
      ? Object.fromEntries([...targets].map(([key, current]) => [key, source.list(current.parentID)]))
      : children()

  function target(parentID: string): SubagentTarget {
    return options.target(parentID)
  }

  function applySession(items: readonly Session[], parentID: string, mutation: SessionMutation) {
    const next = items.filter(
      (item) => item.id !== (mutation.type === 'upsert' ? mutation.info.id : mutation.sessionID),
    )

    if (mutation.type === 'upsert' && mutation.info.parentID === parentID) next.push(mutation.info)

    return next.sort((a, b) => a.time.created - b.time.created || a.id.localeCompare(b.id))
  }

  function applyStatus(current: Record<string, SessionStatus>, mutation: Pick<StatusMutation, 'sessionID' | 'status'>) {
    return { ...current, [mutation.sessionID]: mutation.status }
  }

  function recordSession(mutation: SessionMutation) {
    const sessionID = mutation.type === 'upsert' ? mutation.info.id : mutation.sessionID

    for (const key of targets.keys()) {
      remoteFailures.delete(JSON.stringify([key, sessionID]))
      remoteRetryAt.delete(JSON.stringify([key, sessionID]))

      if (mutation.type === 'remove') history.remove(key, sessionID)
    }
    for (const journal of journals) journal.sessions.push(mutation)

    if (options.cache === 'model')
      setChildren((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, items]) => [
            key,
            applySession(items, targets.get(key)!.parentID, mutation),
          ]),
        ),
      )
  }

  function recordStatus(input: Pick<StatusMutation, 'sessionID' | 'status'>) {
    const mutation: StatusMutation = {
      ...input,
      at: now(),
      startedAt: source?.startedAt?.(input.sessionID),
      observed: new Set(),
    }

    for (const journal of journals) journal.statuses.push(mutation)
    batch(() => {
      for (const [key, items] of Object.entries(snapshots())) {
        if (items.every((item) => item.id !== mutation.sessionID)) continue

        history.observeStatus(key, mutation.sessionID, mutation.status, mutation.at, mutation.startedAt)
        mutation.observed.add(key)
      }

      if (options.cache === 'model')
        setStatuses((current) =>
          Object.fromEntries(Object.entries(current).map(([key, value]) => [key, applyStatus(value, mutation)])),
        )
    })
  }

  function recordError(input: { sessionID?: string; error?: SubagentError }) {
    if (!input.sessionID) return

    const mutation: ErrorMutation = { sessionID: input.sessionID, error: input.error, at: now(), observed: new Set() }

    for (const journal of journals) journal.errors.push(mutation)
    for (const [key, items] of Object.entries(snapshots())) {
      if (items.every((item) => item.id !== mutation.sessionID)) continue

      history.observeError(key, mutation.sessionID, mutation.error, mutation.at)
      mutation.observed.add(key)
    }
  }

  async function refreshTarget(current: SubagentTarget, force = false) {
    const pending = refreshing.get(current.key)

    if (pending && !force) return pending

    const journal = {
      sessions: [] as SessionMutation[],
      statuses: [] as StatusMutation[],
      errors: [] as ErrorMutation[],
    }

    journals.add(journal)
    targets.set(current.key, current)
    const requestState = requests.start(current.key, 'refresh subagents', current.key in children(), force)

    if (!requestState) {
      journals.delete(journal)

      return pending!
    }

    const signal = AbortSignal.any([requestState.signal, AbortSignal.timeout(5000)])
    const request = options
      .snapshot(current, signal)
      .then(async (snapshot) => {
        let nextChildren: readonly Session[] = snapshot.sessions

        for (const mutation of journal.sessions) nextChildren = applySession(nextChildren, current.parentID, mutation)

        let nextStatuses = { ...snapshot.statuses }
        const missing: Record<string, boolean> = {}
        const remoteStatuses = options.remoteStatus
          ? await Promise.all(
              nextChildren.map(async (session) => {
                const key = JSON.stringify([current.key, session.id])

                return (remoteRetryAt.get(key) ?? 0) <= now()
                  ? options.remoteStatus!(session, requestState.signal)
                  : { sessionID: session.id, failed: true, cooldown: true, status: undefined }
              }),
            )
          : []

        if (!requestState.isCurrent()) return

        for (const result of remoteStatuses) {
          if (!result) continue

          const key = JSON.stringify([current.key, result.sessionID])

          if (result.failed) {
            missing[result.sessionID] = true

            if (!('cooldown' in result)) {
              const failures = (remoteFailures.get(key) ?? 0) + 1

              remoteFailures.set(key, failures)

              if (failures >= 3) remoteRetryAt.set(key, now() + 30_000)
            }

            const previous = statuses()[current.key]?.[result.sessionID]

            if (previous) nextStatuses[result.sessionID] = previous
            else delete nextStatuses[result.sessionID]

            continue
          }

          remoteFailures.delete(key)
          remoteRetryAt.delete(key)
          nextStatuses[result.sessionID] = result.status ?? { type: 'idle' }
        }
        for (const mutation of journal.sessions) nextChildren = applySession(nextChildren, current.parentID, mutation)
        for (const mutation of journal.statuses) nextStatuses = applyStatus(nextStatuses, mutation)

        if (requestState.isCurrent()) {
          batch(() => {
            for (const session of nextChildren) {
              const mutations = journal.statuses.filter((mutation) => mutation.sessionID === session.id)

              if (mutations.length > 0) {
                for (const mutation of mutations) {
                  if (!mutation.observed.has(current.key))
                    history.observeStatus(current.key, session.id, mutation.status, mutation.at, mutation.startedAt)
                }
              } else if (!missing[session.id]) {
                const status = nextStatuses[session.id] ?? { type: 'idle' as const }

                nextStatuses[session.id] = status
                history.observeStatus(current.key, session.id, status, now(), source?.startedAt?.(session.id))
              }

              for (const mutation of journal.errors) {
                if (mutation.sessionID === session.id && !mutation.observed.has(current.key))
                  history.observeError(current.key, session.id, mutation.error, mutation.at)
              }
            }

            if (options.cache === 'model') {
              setChildren((value) => ({ ...value, [current.key]: nextChildren }))
              setStatuses((value) => ({ ...value, [current.key]: nextStatuses }))
            }

            setUnavailable((value) => ({ ...value, [current.key]: missing }))
          })
        }

        requestState.succeed()
      })
      .catch((error) => {
        requestState.fail(error)
        throw error
      })
      .finally(() => {
        journals.delete(journal)
        requestState.finish()

        if (refreshing.get(current.key) === request) refreshing.delete(current.key)
      })

    refreshing.set(current.key, request)

    return request
  }

  function refresh(parentID: string, force = false) {
    return refreshTarget(target(parentID), force)
  }

  function list(parentID: string) {
    const current = target(parentID)
    const currentStatuses =
      options.cache === 'source'
        ? Object.fromEntries(source.list(parentID).map((item) => [item.id, source.status(item.id)]))
        : (statuses()[current.key] ?? {})

    return (snapshots()[current.key] ?? [])
      .map((session) => ({
        session,
        status:
          currentStatuses[session.id] ??
          (unavailable()[current.key]?.[session.id] ? undefined : source.status(session.id)),
      }))
      .filter((item): item is { session: Session; status: Extract<SessionStatus, { type: 'busy' | 'retry' }> } =>
        activeStatus(item.status),
      )
      .map((item) => ({
        ...item,
        run: history.active(current.key, item.session.id),
        unavailable: unavailable()[current.key]?.[item.session.id],
      }))
  }

  function recent(parentID: string) {
    const current = target(parentID)
    const sessions = new Map((snapshots()[current.key] ?? []).map((session) => [session.id, session]))

    const recorded = history.recent(current.key).flatMap((run) => {
      const session = sessions.get(run.sessionID)

      return session ? [{ session, status: { type: 'idle' as const }, run, unavailable: false }] : []
    })
    const known = new Set(recorded.map((item) => item.session.id))
    const unobserved = [...sessions.values()]
      .filter((session) => {
        if (known.has(session.id) || unavailable()[current.key]?.[session.id]) return false

        const status = options.cache === 'source' ? source.status(session.id) : statuses()[current.key]?.[session.id]

        return status?.type === 'idle'
      })
      .map((session) => ({ session, status: { type: 'idle' as const }, run: undefined, unavailable: false }))

    return [...recorded, ...unobserved]
      .sort((a, b) => (b.run?.finishedAt ?? b.session.time.updated) - (a.run?.finishedAt ?? a.session.time.updated))
      .slice(0, 10)
  }

  const unsubscribe = options.subscribe((event) => {
    switch (event.type) {
      case 'upsert': {
        recordSession(event)
        break
      }

      case 'remove': {
        recordSession(event)
        recordStatus({ sessionID: event.sessionID, status: { type: 'idle' } })
        break
      }

      case 'status': {
        recordStatus(event)
        break
      }

      case 'error': {
        recordError(event)
        break
      }

      case 'reconnect': {
        const current = activeTarget ? targets.get(activeTarget) : undefined

        if (current)
          void retryBackgroundRefresh(() => refreshTarget(current), { signal: options.lifecycle.signal }).catch(
            () => {},
          )

        break
      }
      // No default
    }
  })

  options.lifecycle.onDispose(() => {
    unsubscribe()

    if (pollTimer) clearTimeout(pollTimer)
  })

  return {
    target,
    list,
    recent,
    refresh,
    state(parentID: string) {
      return requests.state(target(parentID).key)
    },
    retry(parentID: string) {
      return refresh(parentID, true)
    },
    activate(parentID: string) {
      const current = target(parentID)

      targets.set(current.key, current)

      if (activeTarget !== current.key) {
        if (pollTimer) clearTimeout(pollTimer)

        requests.abortAll()
        refreshing.clear()
        activeTarget = current.key
        leases = new Set()
        const poll = () => {
          if (activeTarget !== current.key || options.lifecycle.signal.aborted) return

          void refreshTarget(current).catch(() => {})
          pollTimer = setTimeout(poll, POLL_INTERVAL_MS)
        }

        if (options.cache === 'model') pollTimer = setTimeout(poll, POLL_INTERVAL_MS)
      }

      const lease = Symbol(current.key)

      leases.add(lease)

      return () => {
        if (activeTarget !== current.key || !leases.delete(lease) || leases.size > 0) return

        activeTarget = undefined

        if (pollTimer) clearTimeout(pollTimer)

        pollTimer = undefined
        requests.abortAll()
        refreshing.clear()
      }
    },
    open(sessionID: string) {
      options.open(sessionID)
    },
  }
}

export type SubagentController = ReturnType<typeof createSubagentModel>
