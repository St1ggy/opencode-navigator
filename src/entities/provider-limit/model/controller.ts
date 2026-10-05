import { createSignal, untrack } from 'solid-js'

import { createRequestState } from '../../../shared/lib/request-state'

import { normalizeProviderQuota } from './types'

import type { ProviderQuotaAdapter, ProviderQuotaSnapshot, SelectedModel } from './types'

export function createProviderLimitsController(
  adapters: readonly ProviderQuotaAdapter[],
  selectedModel: () => SelectedModel | undefined,
  signal?: AbortSignal,
) {
  const requests = createRequestState(signal)
  const [snapshots, setSnapshots] = createSignal<Record<string, ProviderQuotaSnapshot>>({})
  const targetKey = (model: SelectedModel) => JSON.stringify(model)
  let activeKey: string | undefined
  let targetAbort = new AbortController()

  function current() {
    const model = selectedModel()
    const adapter = model && adapters.find((candidate) => candidate.supports(model))
    const key = model ? targetKey(model) : undefined

    if (activeKey !== key) {
      untrack(requests.abortAll)
      targetAbort.abort()
      targetAbort = new AbortController()
      activeKey = key
    }

    return { model, adapter }
  }

  async function refresh(force = false) {
    const { model, adapter } = current()

    if (!model || !adapter) return

    const key = targetKey(model)
    const request = requests.start(key, 'read provider limits', Boolean(snapshots()[key]), force)

    if (!request) return

    try {
      const snapshot = normalizeProviderQuota(await adapter.read(model, request.signal))

      if (!request.isCurrent() || targetKey(current().model ?? model) !== key) return

      setSnapshots((value) => ({ ...value, [key]: snapshot }))
      request.succeed()
    } catch (error) {
      const status =
        (error as { status?: number; response?: { status?: number } })?.status ??
        (error as { response?: { status?: number } })?.response?.status

      if (status === 429 && request.isCurrent()) {
        setSnapshots((value) => ({
          ...value,
          [key]: {
            model,
            providerId: adapter.id,
            providerName: adapter.name,
            fetchedAt: Date.now(),
            availability: 'rate_limited',
            windows: [],
          },
        }))
        request.succeed()
      } else request.fail(error)
    } finally {
      request.finish()
    }
  }

  return {
    current,
    targetSignal() {
      current()

      return signal ? AbortSignal.any([signal, targetAbort.signal]) : targetAbort.signal
    },
    refresh,
    snapshot() {
      const { model, adapter } = current()

      return model && adapter ? snapshots()[targetKey(model)] : undefined
    },
    state() {
      const { model, adapter } = current()

      return model && adapter ? requests.state(targetKey(model)) : { status: 'idle' as const }
    },
    dispose() {
      targetAbort.abort()
      requests.abortAll()
      for (const adapter of adapters) void adapter.dispose?.()
    },
  }
}
