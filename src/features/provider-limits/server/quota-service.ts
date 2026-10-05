import { createHash } from 'node:crypto'

import { providerQuotaCapability } from '../model/provider-capabilities'

import { createCopilotQuotaReader } from './copilot-quotas'
import { readFireworksQuota } from './fireworks-quotas'
import { googleQuotaFailureWindows } from './google-quota-parser'
import { nativeHeaderWindows } from './header-parsers'
import { QuotaReadError, readQuotaResponseBody } from './native-http'
import { readOpenRouterQuota } from './openrouter-quotas'
import { nativeQuotaContext, requestUsesCredential, sameNativeConnection } from './quota-auth'
import { withinQuotaSignal } from './quota-deadline'
import { readNativeRest } from './rest-balances'

import type { NativeQuotaRequest } from './native-context'
import type { ProviderQuotaSnapshot, SelectedModel } from '../../../entities/provider-limit'
import type { Context } from '@opencode/plugin/promise/plugin'
import type { SessionHttpRequest, SessionHttpResponse } from '@opencode/plugin/promise/session'

export type ReadTarget = {
  providerID: string
  modelID: string
  sessionID: string
  connectionID?: string
  variant?: string
  force?: boolean
}
type Captured = { key: string; generation: number }

function key(input: NativeQuotaRequest) {
  return JSON.stringify([
    input.model.providerID,
    input.model.modelID,
    input.model.variant,
    input.connectionID,
    createHash('sha256').update(input.token).digest('hex'),
  ])
}

function modelForEvent(event: SessionHttpRequest | SessionHttpResponse): SelectedModel {
  return { providerID: event.model.providerID, modelID: event.model.id, sessionID: event.sessionID }
}

function rejectedRead(model: SelectedModel, error: unknown, input?: NativeQuotaRequest): ProviderQuotaSnapshot {
  const status = error instanceof QuotaReadError ? error.status : undefined
  const states: Record<number, ProviderQuotaSnapshot['availability']> = {
    429: 'rate_limited',
    401: 'unauthenticated',
    403: 'permission_required',
    404: 'unsupported',
  }

  return {
    model,
    providerId: model.providerID,
    providerName: input?.provider.name ?? providerQuotaCapability(model.providerID).name,
    fetchedAt: Date.now(),
    windows: [],
    ...(input && { connectionID: input.connectionID }),
    availability: status === undefined ? 'unavailable' : (states[status] ?? 'unavailable'),
    message:
      status === 403
        ? 'The active credential does not have the provider quota/billing permission required by this API.'
        : 'The documented provider quota source is unavailable. No credentials or raw provider error details are exposed.',
  }
}

export function createNativeQuotaService(
  host: Context,
  lifecycle: AbortSignal,
  fetcher: typeof fetch = fetch,
  copilot = createCopilotQuotaReader(),
) {
  const observed = new Map<string, ProviderQuotaSnapshot>()
  const cached = new Map<string, ProviderQuotaSnapshot>()
  const captured = new WeakMap<Request, Captured>()
  let generation = 0
  const base = (model: SelectedModel): ProviderQuotaSnapshot => ({
    model,
    providerId: model.providerID,
    providerName: providerQuotaCapability(model.providerID).name,
    fetchedAt: Date.now(),
    windows: [],
    availability: 'unavailable',
  })

  async function rest(input: NativeQuotaRequest) {
    if (input.canonical === 'openrouter') return readOpenRouterQuota(input)

    if (input.canonical === 'fireworks-ai') return readFireworksQuota(input)

    if (input.canonical === 'github-copilot') return copilot.read(input)

    return readNativeRest(input)
  }

  async function currentResult(input: NativeQuotaRequest, force?: boolean) {
    const identity = key(input)
    const headers = observed.get(identity)
    const existing = cached.get(identity)
    let result = !force && existing && Date.now() - existing.fetchedAt < 30_000 ? existing : undefined

    if (headers && input.canonical === 'anthropic') result = headers
    else if (!result) {
      try {
        result = await rest(input)
      } catch (error) {
        // Observed model limits remain useful when a separate billing API rejects access.
        if (!headers) throw error

        result = headers
      }
    }

    return { identity, headers, result: result ?? headers }
  }

  return {
    invalidate() {
      generation++
      cached.clear()
      observed.clear()
    },
    async request(event: SessionHttpRequest) {
      if (
        lifecycle.aborted ||
        event.kind !== 'primary' ||
        !/(?:\/chat\/completions|\/messages|\/responses|:generateContent|:streamGenerateContent)$/.test(
          new URL(event.request.url).pathname,
        )
      )
        return

      const epoch = generation
      const observation = AbortSignal.any([lifecycle, AbortSignal.timeout(1000)])

      try {
        const input = await withinQuotaSignal(observation, () =>
          nativeQuotaContext(host, modelForEvent(event), observation, fetcher),
        )

        if (
          input &&
          epoch === generation &&
          requestUsesCredential(event.request, input) &&
          (await withinQuotaSignal(observation, () => sameNativeConnection(host, input)))
        )
          captured.set(event.request, { key: key(input), generation: epoch })
      } catch {
        /*
        Observability must never affect an inference request.
        */
      }
    },
    async response(event: SessionHttpResponse) {
      const request = captured.get(event.request)

      if (!request || request.generation !== generation || lifecycle.aborted) return false

      const observation = AbortSignal.any([lifecycle, AbortSignal.timeout(1000)])

      try {
        const input = await withinQuotaSignal(observation, () =>
          nativeQuotaContext(host, modelForEvent(event), observation, fetcher),
        )

        if (
          !input ||
          key(input) !== request.key ||
          !(await withinQuotaSignal(observation, () => sameNativeConnection(host, input)))
        )
          return false

        let windows = nativeHeaderWindows(input.canonical, input.model.modelID, event.response.headers)

        if (
          windows.length === 0 &&
          event.response.status === 429 &&
          ['google', 'google-vertex'].includes(input.canonical) &&
          event.response.headers.get('content-type')?.includes('json')
        )
          windows = googleQuotaFailureWindows(
            await readQuotaResponseBody(event.response.clone(), observation),
            input.model.modelID,
            input.apiModelID,
          )

        if (windows.length === 0 || request.generation !== generation) return false

        observed.set(request.key, {
          ...base(input.model),
          providerName: input.provider.name,
          connectionID: input.connectionID,
          availability: 'ready',
          windows,
          message: 'Provider-native API limits observed from this model response; no extra inference request was made.',
        })

        return true
      } catch {
        return false
      }
    },
    async read(target: ReadTarget, signal: AbortSignal): Promise<ProviderQuotaSnapshot> {
      const model: SelectedModel = {
        providerID: target.providerID,
        modelID: target.modelID,
        sessionID: target.sessionID,
        ...(target.variant && { variant: target.variant }),
      }
      const epoch = generation
      const combined = AbortSignal.any([lifecycle, signal, AbortSignal.timeout(15_000)])
      let input: NativeQuotaRequest | undefined

      try {
        input = await withinQuotaSignal(combined, () => nativeQuotaContext(host, model, combined, fetcher))

        if (!input)
          return {
            ...base(model),
            availability: 'unauthenticated',
            message: 'No eligible active provider connection or selected model was reported by OpenCode.',
          }

        if (target.connectionID && target.connectionID !== input.connectionID)
          return {
            ...base(model),
            availability: 'unauthenticated',
            message: 'The OpenCode connection changed; the old account is not queried.',
          }

        const current = input
        const { identity, headers, result } = await withinQuotaSignal(combined, () =>
          currentResult(current, target.force),
        )

        combined.throwIfAborted()

        if (epoch !== generation || !(await withinQuotaSignal(combined, () => sameNativeConnection(host, current))))
          return {
            ...base(model),
            availability: 'unauthenticated',
            message: 'The provider account changed during the quota read.',
          }

        if (!result) {
          const capability = providerQuotaCapability(input.canonical)

          return {
            ...base(model),
            providerName: input.provider.name,
            connectionID: input.connectionID,
            availability: capability.sources.length > 0 ? 'waiting' : 'unsupported',
            message: capability.reason,
          }
        }

        const freshHeaders = headers && Date.now() - headers.fetchedAt <= 120_000
        const merged = {
          ...result,
          model,
          connectionID: input.connectionID,
          windows: [...result.windows, ...(freshHeaders && headers !== result ? headers.windows : [])],
          ...(headers === result && Date.now() - result.fetchedAt > 120_000 && { availability: 'stale' as const }),
        }

        if (headers !== result) cached.set(identity, { ...result, model, connectionID: input.connectionID })

        return merged
      } catch (error) {
        if (signal.aborted || lifecycle.aborted) throw error

        return rejectedRead(model, error, input)
      }
    },
    async dispose() {
      cached.clear()
      observed.clear()
      await copilot.dispose()
    },
  }
}
