import type { TuiPluginApi, TuiSidebarMcpItem } from "@opencode-ai/plugin/tui"
import { createSignal } from "solid-js"
import { currentLocation } from "../location"
import { preferencesScope } from "../preferences-schema"
import { mcpToggleAction } from "../state"
import type { McpPreferencesAccess } from "./preferences"
import { createRequestState, isAbortError, retryBackgroundRefresh } from "./request-state"

type McpTarget = {
  key: string
  scope: string
  routing: { directory: string; workspace?: string }
}

type McpAction = "connect" | "disconnect"

export type McpBulkState = {
  action: McpAction
  status: "idle" | "running" | "ready" | "error"
  completed: number
  total: number
  failed: string[]
}

function statusError(status: unknown) {
  if (!status || typeof status !== "object" || !("error" in status)) return
  const error = (status as { error?: unknown }).error
  return typeof error === "string" ? error : undefined
}

export function createMcpController(api: TuiPluginApi, persist: () => boolean, preferences: McpPreferencesAccess) {
  const [snapshots, setSnapshots] = createSignal<Record<string, ReadonlyArray<TuiSidebarMcpItem>>>({})
  const [mutationCounts, setMutationCounts] = createSignal<Record<string, number>>({})
  const [bulkStates, setBulkStates] = createSignal<Record<string, McpBulkState>>({})
  const refreshing = new Map<string, Promise<ReadonlyArray<TuiSidebarMcpItem>>>()
  const mutations = new Map<string, Promise<void>>()
  const mutationRetries = new Map<string, () => Promise<void>>()
  const bulkGenerations = new Map<string, number>()
  const requests = createRequestState(api.lifecycle?.signal)
  const serverRequests = createRequestState(api.lifecycle?.signal)
  let activation = 0
  let activeTarget: string | undefined

  function changeMutationCount(current: McpTarget, offset: number) {
    setMutationCounts((values) => {
      const next = Math.max(0, (values[current.key] ?? 0) + offset)
      if (next === 0) {
        const copy = { ...values }
        delete copy[current.key]
        return copy
      }
      return { ...values, [current.key]: next }
    })
  }

  function setActive(current: McpTarget) {
    if (activeTarget === current.key) return
    if (activeTarget) {
      bulkGenerations.set(activeTarget, (bulkGenerations.get(activeTarget) ?? 0) + 1)
      setBulkStates((values) => {
        const state = values[activeTarget!]
        if (!state || state.status !== "running") return values
        return { ...values, [activeTarget!]: { ...state, status: "idle" } }
      })
    }
    activation += 1
    requests.abortAll()
    serverRequests.abortAll()
    refreshing.clear()
    activeTarget = current.key
  }

  function target(): McpTarget {
    const location = currentLocation(api)
    return {
      key: location.key,
      scope: preferencesScope({ directory: location.routing.directory, worktree: api.state.path.worktree }),
      routing: location.routing,
    }
  }

  function serverKey(current: McpTarget, name: string) {
    return JSON.stringify([current.key, name])
  }

  function list(current = target()) {
    return snapshots()[current.key] ?? api.state.mcp()
  }

  async function refresh(current = target(), force = false): Promise<ReadonlyArray<TuiSidebarMcpItem>> {
    const pending = refreshing.get(current.key)
    if (pending && !force) return pending

    const requestState = requests.start(current.key, "refresh MCP servers", current.key in snapshots(), force)
    if (!requestState) return pending!
    const request = api.client.mcp
      .status(current.routing, { throwOnError: true, signal: requestState.signal })
      .then((result) => {
        const items = Object.entries(result.data ?? {})
          .map(([name, status]) => ({ name, status: status.status, error: statusError(status) }))
          .sort((a, b) => a.name.localeCompare(b.name))
        if (requestState.isCurrent()) setSnapshots((value) => ({ ...value, [current.key]: items }))
        requestState.succeed()
        return items
      })
      .catch((cause) => {
        requestState.fail(cause)
        throw cause
      })
      .finally(() => {
        requestState.finish()
        if (refreshing.get(current.key) === request) refreshing.delete(current.key)
      })
    refreshing.set(current.key, request)
    return request
  }

  async function changeServer(
    current: McpTarget,
    name: string,
    action: McpAction,
    operation = `${action} MCP server`,
    refreshAfter = true,
  ) {
    const key = serverKey(current, name)
    const pending = mutations.get(key)
    if (pending) return pending

    const requestState = serverRequests.start(key, operation, false)
    if (!requestState) return mutations.get(key)!
    changeMutationCount(current, 1)
    const request = (
      action === "disconnect"
        ? api.client.mcp.disconnect({ name, ...current.routing }, { throwOnError: true, signal: requestState.signal })
        : api.client.mcp.connect({ name, ...current.routing }, { throwOnError: true, signal: requestState.signal })
    )
      .then(() => {
        requestState.succeed()
        mutationRetries.delete(key)
      })
      .catch((cause) => {
        requestState.fail(cause)
        if (!requestState.signal.aborted && !isAbortError(cause)) {
          mutationRetries.set(key, () => changeServer(current, name, action, operation))
        }
        throw cause
      })
      .finally(() => {
        requestState.finish()
        changeMutationCount(current, -1)
        if (mutations.get(key) === request) mutations.delete(key)
      })
    mutations.set(key, request)
    await request
    if (refreshAfter) await refresh(current, true)
  }

  function save(current: McpTarget, name: string, disabled: boolean) {
    if (!persist()) return
    preferences.setDesiredMcpState(current.scope, name, disabled ? "disabled" : "enabled")
  }

  async function toggle(name: string) {
    const current = target()
    const item = list(current).find((candidate) => candidate.name === name)
    const action = item && mcpToggleAction(item.status)
    if (!action || mutations.has(serverKey(current, name))) return

    activation += 1
    save(current, name, action === "disconnect")
    await changeServer(current, name, action)
  }

  async function activate(current = target()) {
    setActive(current)
    const generation = ++activation
    const hydration = preferences.load()
    if (!hydration) return
    await hydration
    const items = await refresh(current, true)
    if (!persist() || generation !== activation || target().key !== current.key) return

    const results = await Promise.allSettled(
      items.map(async (item) => {
        if (!persist() || generation !== activation || target().key !== current.key) return
        const desired = preferences.desiredMcpState(current.scope, item.name)
        const action = mcpToggleAction(item.status)
        if (desired === "disabled" && action === "disconnect") {
          await changeServer(current, item.name, "disconnect", "restore MCP preference", false)
        }
        if (desired === "enabled" && action === "connect") {
          await changeServer(current, item.name, "connect", "restore MCP preference", false)
        }
      }),
    )
    const failed = api.lifecycle?.signal.aborted
      ? []
      : results.flatMap((result, index) =>
          result.status === "rejected" && !isAbortError(result.reason) ? [items[index].name] : [],
        )
    if (failed.length > 0) {
      api.ui.toast({
        variant: "warning",
        title: "MCP preferences",
        message: `Could not restore: ${failed.join(", ")}`,
        duration: 4000,
      })
    }
    if (generation === activation && target().key === current.key) await refresh(current, true)
  }

  function reconnect(current = target()) {
    return retryBackgroundRefresh(() => activate(current), { signal: api.lifecycle?.signal })
  }

  function bulkState(current = target()): McpBulkState {
    return (
      bulkStates()[current.key] ?? {
        action: "connect",
        status: "idle",
        completed: 0,
        total: 0,
        failed: [],
      }
    )
  }

  async function changeAll(action: McpAction, current = target(), names?: string[]) {
    setActive(current)
    const generation = (bulkGenerations.get(current.key) ?? 0) + 1
    bulkGenerations.set(current.key, generation)
    const candidates =
      names ??
      list(current)
        .filter((item) => mcpToggleAction(item.status) === action)
        .map((item) => item.name)
    setBulkStates((values) => ({
      ...values,
      [current.key]: { action, status: "running", completed: 0, total: candidates.length, failed: [] },
    }))
    if (candidates.length === 0) {
      setBulkStates((values) => ({
        ...values,
        [current.key]: { action, status: "ready", completed: 0, total: 0, failed: [] },
      }))
      return
    }

    const failed: string[] = []
    await Promise.all(
      candidates.map(async (name) => {
        save(current, name, action === "disconnect")
        try {
          await changeServer(current, name, action, `${action} all MCP servers`, false)
        } catch (cause) {
          if (!isAbortError(cause)) failed.push(name)
        } finally {
          setBulkStates((values) => {
            if (bulkGenerations.get(current.key) !== generation) return values
            const state = values[current.key]
            if (!state || state.action !== action) return values
            return { ...values, [current.key]: { ...state, completed: state.completed + 1 } }
          })
        }
      }),
    )
    if (bulkGenerations.get(current.key) !== generation) return
    if (activeTarget === current.key) await refresh(current, true).catch(() => {})
    failed.sort((left, right) => left.localeCompare(right))
    setBulkStates((values) => ({
      ...values,
      [current.key]: {
        action,
        status: failed.length > 0 ? "error" : "ready",
        completed: candidates.length,
        total: candidates.length,
        failed,
      },
    }))
    if (failed.length > 0 && activeTarget === current.key) {
      api.ui.toast({
        variant: "warning",
        title: "MCP servers",
        message: `Could not ${action}: ${failed.join(", ")}`,
        duration: 4000,
      })
    }
  }

  return {
    list,
    refresh,
    reconnect,
    activate,
    deactivate(current: McpTarget) {
      if (activeTarget !== current.key) return
      activeTarget = undefined
      activation += 1
      bulkGenerations.set(current.key, (bulkGenerations.get(current.key) ?? 0) + 1)
      setBulkStates((values) => {
        const state = values[current.key]
        if (!state || state.status !== "running") return values
        return { ...values, [current.key]: { ...state, status: "idle" } }
      })
      requests.abortAll()
      serverRequests.abortAll()
      refreshing.clear()
    },
    target,
    toggle,
    persist,
    state(current = target()) {
      return requests.state(current.key)
    },
    retry(current = target()) {
      return refresh(current, true)
    },
    serverState(name: string, current = target()) {
      return serverRequests.state(serverKey(current, name))
    },
    retryServer(name: string, current = target()) {
      return mutationRetries.get(serverKey(current, name))?.()
    },
    mutating(current = target()) {
      return (mutationCounts()[current.key] ?? 0) > 0
    },
    bulkState,
    connectAll(current = target()) {
      return changeAll("connect", current)
    },
    disconnectAll(current = target()) {
      return changeAll("disconnect", current)
    },
    retryBulk(current = target()) {
      const state = bulkState(current)
      if (state.status !== "error" || state.failed.length === 0) return
      return changeAll(state.action, current, state.failed)
    },
  }
}

export type McpController = ReturnType<typeof createMcpController>
