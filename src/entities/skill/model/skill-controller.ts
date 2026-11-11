import { createSignal } from 'solid-js'

import { createRequestState, retryBackgroundRefresh } from '../../../shared/lib/request-state'

import type { Lifecycle } from '../../../shared/lib/lifecycle'
import type { SkillSource, SkillTarget } from './source'
import type { SkillInfo } from './types'

export type { SkillInfo } from './types'

export function createSkillModel(options: {
  lifecycle: Lifecycle
  target(): SkillTarget
  source: SkillSource
  cache: 'source' | 'model'
  onReconnect(listener: () => void): () => void
  useNamed?(target: SkillTarget, name: string, signal: AbortSignal): Promise<boolean>
}) {
  const { source, lifecycle } = options
  const [skills, setSkills] = createSignal<Record<string, readonly SkillInfo[]>>({})
  const refreshing = new Map<string, Promise<readonly SkillInfo[]>>()
  const targets = new Map<string, SkillTarget>()
  const requests = createRequestState(lifecycle.signal)
  const promptRequests = createRequestState(lifecycle.signal)
  let activeTarget: string | undefined
  let leases = new Set<symbol>()

  function target() {
    return options.target()
  }

  function list(current = target()) {
    return options.cache === 'source' ? source.list(current) : (skills()[current.key] ?? [])
  }

  function error(current = target()) {
    return requests.state(current.key).error?.message
  }

  async function refresh(current = target(), force = false) {
    const pending = refreshing.get(current.key)

    if (pending && !force) return pending

    targets.set(current.key, current)

    const requestState = requests.start(current.key, 'refresh skills', current.key in skills(), force)

    if (!requestState) return pending!

    const request = source
      .refresh(current, force, requestState.signal)
      .then((data) => {
        const items = [...data].sort((a, b) => a.name.localeCompare(b.name))

        if (options.cache === 'model' && requestState.isCurrent())
          setSkills((value) => ({ ...value, [current.key]: items }))

        requestState.succeed()

        return items
      })
      .catch((error_) => {
        requestState.fail(error_)
        throw error_
      })
      .finally(() => {
        requestState.finish()

        if (refreshing.get(current.key) === request) refreshing.delete(current.key)
      })

    refreshing.set(current.key, request)

    return request
  }

  const unsubscribe = options.onReconnect(() => {
    for (const current of targets.values()) {
      void retryBackgroundRefresh(() => refresh(current), { signal: lifecycle.signal }).catch(() => {})
    }
  })

  lifecycle.onDispose(unsubscribe)

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
    activate(current = target()) {
      targets.set(current.key, current)

      if (activeTarget !== current.key) {
        requests.abortAll()
        promptRequests.abortAll()
        refreshing.clear()
        activeTarget = current.key
        leases = new Set()
        targets.clear()
        targets.set(current.key, current)
      }

      const lease = Symbol(current.key)

      leases.add(lease)

      return () => {
        if (activeTarget !== current.key || !leases.delete(lease) || leases.size > 0) return

        activeTarget = undefined
        targets.delete(current.key)
        requests.abortAll()
        promptRequests.abortAll()
        refreshing.clear()
      }
    },
    async use(current: SkillTarget, name: string, selected?: SkillInfo) {
      if ((activeTarget && activeTarget !== current.key) || target().key !== current.key)
        throw new DOMException('Sidebar context changed', 'AbortError')

      const request = promptRequests.start(current.key, 'insert skill', false, true)

      if (!request) return false

      try {
        const result = selected
          ? await source.use(current, selected, request.signal)
          : await options.useNamed?.(current, name, request.signal)

        if (!request.isCurrent()) return false

        request.succeed()

        return result ?? false
      } catch (error_) {
        request.fail(error_)
        throw error_
      } finally {
        request.finish()
      }
    },
  }
}

export type SkillController = ReturnType<typeof createSkillModel>
