import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { Session, SessionStatus } from "@opencode-ai/sdk/v2"
import { batch, createSignal } from "solid-js"
import { createRequestState, retryBackgroundRefresh } from "./request-state"

type SessionMutation = { type: "upsert"; info: Session } | { type: "remove"; sessionID: string }
type StatusMutation = { sessionID: string; status: SessionStatus }
type SubagentTarget = {
  key: string
  parentID: string
  routing: { directory: string; workspace?: string }
}

function activeStatus(status: SessionStatus | undefined): status is Extract<SessionStatus, { type: "busy" | "retry" }> {
  return status?.type === "busy" || status?.type === "retry"
}

export function createSubagentController(api: TuiPluginApi) {
  const [children, setChildren] = createSignal<Record<string, ReadonlyArray<Session>>>({})
  const [statuses, setStatuses] = createSignal<Record<string, Record<string, SessionStatus>>>({})
  const refreshing = new Map<string, Promise<void>>()
  const journals = new Set<{ sessions: SessionMutation[]; statuses: StatusMutation[] }>()
  const targets = new Map<string, SubagentTarget>()
  const requests = createRequestState(api.lifecycle.signal)
  let activeTarget: string | undefined

  function target(parentID: string): SubagentTarget {
    const parent = api.state.session.get(parentID)
    const directory = parent?.directory ?? api.state.path.directory
    const workspace = parent?.workspaceID
    return {
      key: JSON.stringify([parentID, directory, workspace ?? null]),
      parentID,
      routing: { directory, ...(workspace ? { workspace } : {}) },
    }
  }

  function applySession(items: ReadonlyArray<Session>, parentID: string, mutation: SessionMutation) {
    const next = items.filter(
      (item) => item.id !== (mutation.type === "upsert" ? mutation.info.id : mutation.sessionID),
    )
    if (mutation.type === "upsert" && mutation.info.parentID === parentID) next.push(mutation.info)
    return next.sort((a, b) => a.time.created - b.time.created || a.id.localeCompare(b.id))
  }

  function applyStatus(current: Record<string, SessionStatus>, mutation: StatusMutation) {
    const next = { ...current }
    if (mutation.status.type === "idle") delete next[mutation.sessionID]
    else next[mutation.sessionID] = mutation.status
    return next
  }

  function recordSession(mutation: SessionMutation) {
    for (const journal of journals) journal.sessions.push(mutation)
    setChildren((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, items]) => [key, applySession(items, targets.get(key)!.parentID, mutation)]),
      ),
    )
  }

  function recordStatus(mutation: StatusMutation) {
    for (const journal of journals) journal.statuses.push(mutation)
    setStatuses((current) =>
      Object.fromEntries(Object.entries(current).map(([key, value]) => [key, applyStatus(value, mutation)])),
    )
  }

  async function refreshTarget(current: SubagentTarget, force = false) {
    const pending = refreshing.get(current.key)
    if (pending && !force) return pending

    const journal = { sessions: [] as SessionMutation[], statuses: [] as StatusMutation[] }
    journals.add(journal)
    targets.set(current.key, current)
    const requestState = requests.start(current.key, "refresh subagents", current.key in children(), force)
    if (!requestState) {
      journals.delete(journal)
      return pending!
    }
    const request = Promise.all([
      api.client.session.children(
        { sessionID: current.parentID, ...current.routing },
        { throwOnError: true, signal: requestState.signal },
      ),
      api.client.session.status(current.routing, { throwOnError: true, signal: requestState.signal }),
    ])
      .then(([childResult, statusResult]) => {
        let nextChildren: ReadonlyArray<Session> = childResult.data ?? []
        for (const mutation of journal.sessions) nextChildren = applySession(nextChildren, current.parentID, mutation)

        let nextStatuses = { ...statusResult.data }
        for (const mutation of journal.statuses) nextStatuses = applyStatus(nextStatuses, mutation)

        if (requestState.isCurrent()) {
          batch(() => {
            setChildren((value) => ({ ...value, [current.key]: nextChildren }))
            setStatuses((value) => ({ ...value, [current.key]: nextStatuses }))
          })
        }
        requestState.succeed()
      })
      .catch((cause) => {
        requestState.fail(cause)
        throw cause
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
      .map((session) => ({ session, status: currentStatuses[session.id] ?? api.state.session.status(session.id) }))
      .filter((item): item is { session: Session; status: Extract<SessionStatus, { type: "busy" | "retry" }> } =>
        activeStatus(item.status),
      )
  }

  const unsubscribe = [
    api.event.on("session.created", (event) => recordSession({ type: "upsert", info: event.properties.info })),
    api.event.on("session.updated", (event) => recordSession({ type: "upsert", info: event.properties.info })),
    api.event.on("session.deleted", (event) => {
      recordSession({ type: "remove", sessionID: event.properties.sessionID })
      recordStatus({ sessionID: event.properties.sessionID, status: { type: "idle" } })
    }),
    api.event.on("session.status", (event) => recordStatus(event.properties)),
    api.event.on("session.idle", (event) =>
      recordStatus({ sessionID: event.properties.sessionID, status: { type: "idle" } }),
    ),
    api.event.on("server.connected", () => {
      const current = activeTarget ? targets.get(activeTarget) : undefined
      if (current)
        void retryBackgroundRefresh(() => refreshTarget(current), { signal: api.lifecycle.signal }).catch(() => {})
    }),
  ]
  api.lifecycle.onDispose(() => unsubscribe.forEach((dispose) => dispose()))

  return {
    list,
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
        requests.abortAll()
        refreshing.clear()
        activeTarget = current.key
      }
      return () => {
        if (activeTarget !== current.key) return
        activeTarget = undefined
        requests.abortAll()
        refreshing.clear()
      }
    },
    open(sessionID: string) {
      api.route.navigate("session", { sessionID })
    },
  }
}

export type SubagentController = ReturnType<typeof createSubagentController>
