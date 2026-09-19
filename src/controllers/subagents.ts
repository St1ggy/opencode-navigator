import { batch, createSignal } from 'solid-js'

import { createRequestState, retryBackgroundRefresh } from './request-state'
import { type SubagentError, createSubagentHistory } from './subagent-history'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Session, SessionStatus } from '@opencode-ai/sdk/v2'

type SessionMutation = { type: 'upsert'; info: Session } | { type: 'remove'; sessionID: string }
type StatusMutation = { sessionID: string; status: SessionStatus; at: number; observed: Set<string> }
type ErrorMutation = { sessionID: string; error?: SubagentError; at: number; observed: Set<string> }
type SubagentTarget = {
  key: string
  parentID: string
  routing: { directory: string; workspace?: string }
}

function activeStatus(status: SessionStatus | undefined): status is Extract<SessionStatus, { type: 'busy' | 'retry' }> {
  return status?.type === 'busy' || status?.type === 'retry'
}

export function createSubagentController(api: TuiPluginApi, options: { now?: () => number } = {}) {
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
  const requests = createRequestState(api.lifecycle.signal)
  let activeTarget: string | undefined
  let pollTimer: ReturnType<typeof setTimeout> | undefined

  function target(parentID: string): SubagentTarget {
    const parent = api.state.session.get(parentID)
    const directory = parent?.directory ?? api.state.path.directory
    const workspace = parent?.workspaceID

    return {
      key: JSON.stringify([parentID, directory, workspace ?? null]),
      parentID,
      routing: { directory, ...(workspace && { workspace }) },
    }
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
    setChildren((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, items]) => [key, applySession(items, targets.get(key)!.parentID, mutation)]),
      ),
    )
  }

  function recordStatus(input: Pick<StatusMutation, 'sessionID' | 'status'>) {
    const mutation: StatusMutation = { ...input, at: now(), observed: new Set() }

    for (const journal of journals) journal.statuses.push(mutation)
    batch(() => {
      for (const [key, items] of Object.entries(children())) {
        if (items.every((item) => item.id !== mutation.sessionID)) continue

        history.observeStatus(key, mutation.sessionID, mutation.status, mutation.at)
        mutation.observed.add(key)
      }
      setStatuses((current) =>
        Object.fromEntries(Object.entries(current).map(([key, value]) => [key, applyStatus(value, mutation)])),
      )
    })
  }

  function recordError(input: { sessionID?: string; error?: SubagentError }) {
    if (!input.sessionID) return

    const mutation: ErrorMutation = { sessionID: input.sessionID, error: input.error, at: now(), observed: new Set() }

    for (const journal of journals) journal.errors.push(mutation)
    for (const [key, items] of Object.entries(children())) {
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
    const request = Promise.all([
      api.client.session.children({ sessionID: current.parentID, ...current.routing }, { throwOnError: true, signal }),
      api.client.session.status(current.routing, { throwOnError: true, signal }),
    ])
      .then(async ([childResult, statusResult]) => {
        let nextChildren: readonly Session[] = childResult.data ?? []

        for (const mutation of journal.sessions) nextChildren = applySession(nextChildren, current.parentID, mutation)

        let nextStatuses = { ...statusResult.data }
        const missing: Record<string, boolean> = {}
        const remoteStatuses = await Promise.all(
          nextChildren.map((session) => {
            const key = JSON.stringify([current.key, session.id])

            return (remoteRetryAt.get(key) ?? 0) <= now()
              ? fetchDevTeamStatus(session, requestState.signal)
              : { sessionID: session.id, failed: true, cooldown: true, status: undefined }
          }),
        )

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
                    history.observeStatus(current.key, session.id, mutation.status, mutation.at)
                }
              } else if (!missing[session.id]) {
                const status = nextStatuses[session.id] ?? { type: 'idle' as const }

                nextStatuses[session.id] = status
                history.observeStatus(current.key, session.id, status)
              }

              for (const mutation of journal.errors) {
                if (mutation.sessionID === session.id && !mutation.observed.has(current.key))
                  history.observeError(current.key, session.id, mutation.error, mutation.at)
              }
            }
            setChildren((value) => ({ ...value, [current.key]: nextChildren }))
            setStatuses((value) => ({ ...value, [current.key]: nextStatuses }))
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
    const currentStatuses = statuses()[current.key] ?? {}

    return (children()[current.key] ?? [])
      .map((session) => ({
        session,
        status:
          currentStatuses[session.id] ??
          (unavailable()[current.key]?.[session.id] ? undefined : api.state.session.status(session.id)),
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
    const sessions = new Map((children()[current.key] ?? []).map((session) => [session.id, session]))

    return history.recent(current.key).flatMap((run) => {
      const session = sessions.get(run.sessionID)

      return session ? [{ session, status: { type: 'idle' as const }, run, unavailable: false }] : []
    })
  }

  const unsubscribe = [
    api.event.on('session.created', (event) => recordSession({ type: 'upsert', info: event.properties.info })),
    api.event.on('session.updated', (event) => recordSession({ type: 'upsert', info: event.properties.info })),
    api.event.on('session.deleted', (event) => {
      recordSession({ type: 'remove', sessionID: event.properties.sessionID })
      recordStatus({ sessionID: event.properties.sessionID, status: { type: 'idle' } })
    }),
    api.event.on('session.status', (event) => recordStatus(event.properties)),
    api.event.on('session.error', (event) => recordError(event.properties)),
    api.event.on('session.idle', (event) =>
      recordStatus({ sessionID: event.properties.sessionID, status: { type: 'idle' } }),
    ),
    api.event.on('server.connected', () => {
      const current = activeTarget ? targets.get(activeTarget) : undefined

      if (current)
        void retryBackgroundRefresh(() => refreshTarget(current), { signal: api.lifecycle.signal }).catch(() => {})
    }),
  ]

  api.lifecycle.onDispose(() => {
    for (const dispose of unsubscribe) dispose()

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
        const poll = () => {
          if (activeTarget !== current.key || api.lifecycle.signal.aborted) return

          void refreshTarget(current).catch(() => {})
          pollTimer = setTimeout(poll, 1000)
        }

        pollTimer = setTimeout(poll, 1000)
      }

      return () => {
        if (activeTarget !== current.key) return

        activeTarget = undefined

        if (pollTimer) clearTimeout(pollTimer)

        pollTimer = undefined
        requests.abortAll()
        refreshing.clear()
      }
    },
    open(sessionID: string) {
      api.route.navigate('session', { sessionID })
    },
  }
}

async function fetchDevTeamStatus(
  session: Session,
  signal: AbortSignal,
): Promise<{ sessionID: string; status?: SessionStatus; failed?: boolean } | undefined> {
  const metadata = session.metadata
  const devTeam = metadata && typeof metadata.devTeam === 'object' ? metadata.devTeam : undefined
  const serverUrl = devTeam && 'serverUrl' in devTeam ? devTeam.serverUrl : undefined

  if (typeof serverUrl !== 'string') return

  try {
    const url = new URL('/session/status', serverUrl)

    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return

    url.searchParams.set('directory', session.directory)
    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]),
    })

    if (!response.ok) return { sessionID: session.id, failed: true }

    const statuses: unknown = await response.json()

    if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses))
      return { sessionID: session.id, failed: true }

    const status = (statuses as Record<string, unknown>)[session.id]

    if (
      status !== undefined &&
      (!status ||
        typeof status !== 'object' ||
        !('type' in status) ||
        !['idle', 'busy', 'retry'].includes(String(status.type)))
    )
      return { sessionID: session.id, failed: true }

    if (
      status &&
      typeof status === 'object' &&
      'type' in status &&
      status.type === 'retry' &&
      (!('next' in status) ||
        typeof status.next !== 'number' ||
        !Number.isFinite(status.next) ||
        !('attempt' in status) ||
        typeof status.attempt !== 'number' ||
        !('message' in status) ||
        typeof status.message !== 'string')
    ) {
      return { sessionID: session.id, failed: true }
    }

    return { sessionID: session.id, status: status as SessionStatus | undefined }
  } catch {
    if (signal.aborted) return

    return { sessionID: session.id, failed: true }
  }
}

export type SubagentController = ReturnType<typeof createSubagentController>
