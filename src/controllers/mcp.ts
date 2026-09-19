import { createSignal } from 'solid-js'

import { currentLocation } from '../location'
import { type DesiredMcpStates, type McpPresets, preferencesScope } from '../preferences-schema'
import { mcpToggleAction } from '../state'

import { createRequestState, isAbortError, retryBackgroundRefresh } from './request-state'

import type { McpPreferencesAccess } from './preferences'
import type { TuiPluginApi, TuiSidebarMcpItem } from '@opencode-ai/plugin/tui'

type McpTarget = {
  key: string
  scope: string
  routing: { directory: string; workspace?: string }
}

type McpAction = 'connect' | 'disconnect'

export type McpBulkState = {
  action: McpAction | 'preset'
  preset?: string
  status: 'idle' | 'running' | 'ready' | 'error'
  completed: number
  total: number
  failed: string[]
}

type McpChange = { name: string; action: McpAction }

export function matchingMcpPreset(items: readonly TuiSidebarMcpItem[], presets: McpPresets) {
  if (items.length === 0) return

  return Object.keys(presets)
    .sort((left, right) => left.localeCompare(right))
    .find((name) => {
      const states = presets[name]

      return (
        Object.keys(states).length === items.length &&
        items.every(
          (item) =>
            (item.status === 'connected' && states[item.name] === 'enabled') ||
            (item.status === 'disabled' && states[item.name] === 'disabled'),
        )
      )
    })
}

function statusError(status: unknown) {
  if (!status || typeof status !== 'object' || !('error' in status)) return

  const error = (status as { error?: unknown }).error

  return typeof error === 'string' ? error : undefined
}

export function createMcpController(api: TuiPluginApi, persist: () => boolean, preferences: McpPreferencesAccess) {
  const [snapshots, setSnapshots] = createSignal<Record<string, readonly TuiSidebarMcpItem[]>>({})
  const [mutationCounts, setMutationCounts] = createSignal<Record<string, number>>({})
  const [bulkStates, setBulkStates] = createSignal<Record<string, McpBulkState>>({})
  const [selectedPresets, setSelectedPresets] = createSignal<Record<string, string>>({})
  const refreshing = new Map<string, Promise<readonly TuiSidebarMcpItem[]>>()
  const mutations = new Map<string, Promise<void>>()
  const mutationRetries = new Map<string, () => Promise<void>>()
  const bulkGenerations = new Map<string, number>()
  const bulkRetries = new Map<string, McpChange[]>()
  const selectedPresetStates = new Map<string, DesiredMcpStates>()
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

        if (!state || state.status !== 'running') return values

        return { ...values, [activeTarget!]: { ...state, status: 'idle' } }
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

  function mutating(current = target()) {
    return (mutationCounts()[current.key] ?? 0) > 0
  }

  function resetSelectedPreset(current: McpTarget) {
    selectedPresetStates.delete(current.key)
    setSelectedPresets((values) => {
      const next = { ...values }

      delete next[current.key]

      return next
    })
  }

  function invalidatePresetOperation(current: McpTarget, name: string) {
    const state = bulkStates()[current.key]

    if (state?.action !== 'preset' || state.preset !== name) return

    bulkRetries.delete(current.key)
    setBulkStates((values) => ({
      ...values,
      [current.key]: { ...state, status: 'idle', completed: 0, total: 0, failed: [] },
    }))
  }

  function reconcileSelectedPreset(current: McpTarget, items: readonly TuiSidebarMcpItem[]) {
    const states = selectedPresetStates.get(current.key)
    const bulk = bulkStates()[current.key]

    if (!states || (bulk?.action === 'preset' && (bulk.status === 'running' || bulk.status === 'error'))) return

    const isChanged = items.some((item) => {
      const desired = states[item.name]

      if (!desired) return false

      return (item.status === 'connected' ? 'enabled' : 'disabled') !== desired
    })

    if (isChanged) resetSelectedPreset(current)
  }

  function clearBulkFailure(current: McpTarget, name: string) {
    setBulkStates((values) => {
      const state = values[current.key]

      if (!state || state.status !== 'error' || !state.failed.includes(name)) return values

      const failed = state.failed.filter((candidate) => candidate !== name)

      bulkRetries.set(
        current.key,
        (bulkRetries.get(current.key) ?? []).filter((candidate) => candidate.name !== name),
      )

      return {
        ...values,
        [current.key]: { ...state, status: failed.length > 0 ? 'error' : 'ready', failed },
      }
    })
  }

  function list(current = target()) {
    return snapshots()[current.key] ?? api.state.mcp()
  }

  async function refresh(current = target(), force = false): Promise<readonly TuiSidebarMcpItem[]> {
    const pending = refreshing.get(current.key)

    if (pending && !force) return pending

    const requestState = requests.start(current.key, 'refresh MCP servers', current.key in snapshots(), force)

    if (!requestState) return pending!

    const request = api.client.mcp
      .status(current.routing, { throwOnError: true, signal: requestState.signal })
      .then((result) => {
        const items = Object.entries(result.data ?? {})
          .map(([name, status]) => ({ name, status: status.status, error: statusError(status) }))
          .sort((a, b) => a.name.localeCompare(b.name))

        if (requestState.isCurrent()) setSnapshots((value) => ({ ...value, [current.key]: items }))

        if (requestState.isCurrent()) reconcileSelectedPreset(current, items)

        requestState.succeed()

        return items
      })
      .catch((error) => {
        requestState.fail(error)
        throw error
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
      action === 'disconnect'
        ? api.client.mcp.disconnect({ name, ...current.routing }, { throwOnError: true, signal: requestState.signal })
        : api.client.mcp.connect({ name, ...current.routing }, { throwOnError: true, signal: requestState.signal })
    )
      .then(() => {
        requestState.succeed()
        mutationRetries.delete(key)
        clearBulkFailure(current, name)
      })
      .catch((error) => {
        requestState.fail(error)

        if (!requestState.signal.aborted && !isAbortError(error)) {
          mutationRetries.set(key, () => changeServer(current, name, action, operation))
        }

        throw error
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

    preferences.setDesiredMcpState(current.scope, name, disabled ? 'disabled' : 'enabled')
  }

  async function toggle(name: string) {
    const current = target()
    const item = list(current).find((candidate) => candidate.name === name)
    const action = item && mcpToggleAction(item.status)

    if (!action || mutations.has(serverKey(current, name))) return

    activation += 1
    resetSelectedPreset(current)
    save(current, name, action === 'disconnect')
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

        if (desired === 'disabled' && action === 'disconnect') {
          await changeServer(current, item.name, 'disconnect', 'restore MCP preference', false)
        }

        if (desired === 'enabled' && action === 'connect') {
          await changeServer(current, item.name, 'connect', 'restore MCP preference', false)
        }
      }),
    )
    const failed = api.lifecycle?.signal.aborted
      ? []
      : results.flatMap((result, index) =>
          result.status === 'rejected' && !isAbortError(result.reason) ? [items[index].name] : [],
        )

    if (failed.length > 0) {
      api.ui.toast({
        variant: 'warning',
        title: 'MCP preferences',
        message: `Could not restore: ${failed.join(', ')}`,
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
        action: 'connect',
        status: 'idle',
        completed: 0,
        total: 0,
        failed: [],
      }
    )
  }

  async function changeMany(
    operation: { action: McpAction | 'preset'; preset?: string },
    changes: McpChange[],
    current = target(),
  ) {
    if (mutating(current)) return

    setActive(current)
    const generation = (bulkGenerations.get(current.key) ?? 0) + 1

    bulkGenerations.set(current.key, generation)
    setBulkStates((values) => ({
      ...values,
      [current.key]: { ...operation, status: 'running', completed: 0, total: changes.length, failed: [] },
    }))

    if (changes.length === 0) {
      setBulkStates((values) => ({
        ...values,
        [current.key]: { ...operation, status: 'ready', completed: 0, total: 0, failed: [] },
      }))

      return
    }

    const failed: string[] = []
    const retry: McpChange[] = []

    await Promise.all(
      changes.map(async ({ name, action }) => {
        if (operation.action !== 'preset') save(current, name, action === 'disconnect')

        try {
          const description =
            operation.action === 'preset' ? `apply ${operation.preset} MCP preset` : `${action} all MCP servers`

          await changeServer(current, name, action, description, false)
        } catch (error) {
          if (!isAbortError(error)) {
            failed.push(name)
            retry.push({ name, action })
          }
        } finally {
          setBulkStates((values) => {
            if (bulkGenerations.get(current.key) !== generation) return values

            const state = values[current.key]

            if (!state || state.action !== operation.action) return values

            return { ...values, [current.key]: { ...state, completed: state.completed + 1 } }
          })
        }
      }),
    )

    if (bulkGenerations.get(current.key) !== generation) return

    bulkRetries.set(current.key, retry)

    if (activeTarget === current.key) await refresh(current, true).catch(() => {})

    failed.sort((left, right) => left.localeCompare(right))
    setBulkStates((values) => ({
      ...values,
      [current.key]: {
        ...operation,
        status: failed.length > 0 ? 'error' : 'ready',
        completed: changes.length,
        total: changes.length,
        failed,
      },
    }))

    if (failed.length > 0 && activeTarget === current.key) {
      const action = operation.action === 'preset' ? `apply ${operation.preset}` : operation.action

      api.ui.toast({
        variant: 'warning',
        title: 'MCP servers',
        message: `Could not ${action}: ${failed.join(', ')}`,
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

        if (!state || state.status !== 'running') return values

        return { ...values, [current.key]: { ...state, status: 'idle' } }
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
    mutating,
    bulkState,
    selectedPreset(current = target()) {
      return selectedPresets()[current.key]
    },
    capturePreset(current = target()): DesiredMcpStates {
      return Object.fromEntries(
        list(current).map((item) => [item.name, item.status === 'connected' ? 'enabled' : 'disabled']),
      ) as DesiredMcpStates
    },
    applyPreset(name: string, states: Record<string, 'enabled' | 'disabled'>, current = target()) {
      if (mutating(current)) return

      const items = new Map(list(current).map((item) => [item.name, item]))
      const changes = Object.entries(states).flatMap(([server, desired]) => {
        const item = items.get(server)
        const action = item && mcpToggleAction(item.status)

        if ((desired === 'enabled' && action === 'connect') || (desired === 'disabled' && action === 'disconnect')) {
          return [{ name: server, action }]
        }

        return []
      })

      if (persist()) {
        if (preferences.setDesiredMcpStates) preferences.setDesiredMcpStates(current.scope, states)
        else {
          for (const [server, state] of Object.entries(states)) {
            preferences.setDesiredMcpState(current.scope, server, state)
          }
        }
      }

      setSelectedPresets((values) => ({ ...values, [current.key]: name }))
      selectedPresetStates.set(current.key, { ...states })

      return changeMany({ action: 'preset', preset: name }, changes, current)
    },
    updateSelectedPreset(name: string, current = target()) {
      invalidatePresetOperation(current, name)

      if (selectedPresets()[current.key] === name) resetSelectedPreset(current)
    },
    renameSelectedPreset(previous: string, current = target()) {
      invalidatePresetOperation(current, previous)

      if (selectedPresets()[current.key] === previous) resetSelectedPreset(current)
    },
    clearSelectedPreset(name: string, current = target()) {
      invalidatePresetOperation(current, name)

      if (selectedPresets()[current.key] === name) resetSelectedPreset(current)
    },
    connectAll(current = target()) {
      if (mutating(current)) return

      resetSelectedPreset(current)

      return changeMany(
        { action: 'connect' },
        list(current)
          .filter((item) => mcpToggleAction(item.status) === 'connect')
          .map((item) => ({ name: item.name, action: 'connect' })),
        current,
      )
    },
    disconnectAll(current = target()) {
      if (mutating(current)) return

      resetSelectedPreset(current)

      return changeMany(
        { action: 'disconnect' },
        list(current)
          .filter((item) => mcpToggleAction(item.status) === 'disconnect')
          .map((item) => ({ name: item.name, action: 'disconnect' })),
        current,
      )
    },
    retryBulk(current = target()) {
      const state = bulkState(current)

      if (state.status !== 'error' || state.failed.length === 0) return

      const changes = bulkRetries.get(current.key) ?? []

      return changeMany({ action: state.action, ...(state.preset && { preset: state.preset }) }, changes, current)
    },
  }
}

export type McpController = ReturnType<typeof createMcpController>
