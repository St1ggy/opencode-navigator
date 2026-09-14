import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createSignal } from "solid-js"
import { currentLocation } from "../location"
import { createRequestState, retryBackgroundRefresh } from "./request-state"

export type SkillInfo = { name: string; description?: string; location: string; content: string }

export function createSkillController(api: TuiPluginApi) {
  const [skills, setSkills] = createSignal<Record<string, ReadonlyArray<SkillInfo>>>({})
  const refreshing = new Map<string, Promise<ReadonlyArray<SkillInfo>>>()
  const targets = new Map<string, ReturnType<typeof currentLocation>>()
  const requests = createRequestState(api.lifecycle.signal)

  function target() {
    return currentLocation(api)
  }

  function list(current = target()) {
    return skills()[current.key] ?? []
  }

  function error(current = target()) {
    return requests.state(current.key).error?.message
  }

  async function refresh(current = target(), force = false) {
    const pending = refreshing.get(current.key)
    if (pending && !force) return pending
    targets.set(current.key, current)

    const requestState = requests.start(current.key, "refresh skills", current.key in skills(), force)
    if (!requestState) return pending!
    const request = api.client.app
      .skills(current.routing, { throwOnError: true, signal: requestState.signal })
      .then((result) => {
        const items = [...(result.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))
        if (requestState.isCurrent()) setSkills((value) => ({ ...value, [current.key]: items }))
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

  const unsubscribe = api.event.on("server.connected", () => {
    for (const current of targets.values()) {
      void retryBackgroundRefresh(() => refresh(current), { signal: api.lifecycle.signal }).catch(() => {})
    }
  })
  api.lifecycle.onDispose(unsubscribe)

  return {
    list,
    error,
    refresh,
    target,
    state(current = target()) {
      return requests.state(current.key)
    },
    retry(current = target()) {
      return refresh(current, true)
    },
    use(current: ReturnType<typeof currentLocation>, name: string) {
      return api.client.tui.appendPrompt({ ...current.routing, text: `/${name} ` }, { throwOnError: true })
    },
  }
}

export type SkillController = ReturnType<typeof createSkillController>
