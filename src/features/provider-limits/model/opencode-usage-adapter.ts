import { createSignal } from 'solid-js'

import { projectWorkspaceUsage } from '../../../entities/provider-limit'

import type { ProviderQuotaAdapter, SelectedModel } from '../../../entities/provider-limit'
import type { Plugin } from '@opencode/plugin/tui'

export function createOpenCodeUsageAdapter(context: Plugin.Context) {
  const [revision, setRevision] = createSignal(0)
  let generation = 0
  const location = () => context.location ?? context.data.location.default()
  const provider = (model: SelectedModel) =>
    context.data.location.provider?.list(location())?.find((item) => item.id === model.providerID)
  const connection = () => {
    const item = context.data.location.integration?.list(location())?.find((entry) => entry.id === 'opencode')
      ?.connections[0]

    if (!item) return null

    if (item.type === 'credential') return [item.type, item.id, item.method, item.status]

    return [item.type, item.name, item.status]
  }
  const key = () => JSON.stringify([location(), connection(), revision()])
  const invalidate = () => {
    generation++
  }
  const disposers = [
    context.data.on('credential.updated', invalidate),
    context.data.on('integration.updated', (event) => {
      const directory = event.location?.directory

      if (!directory || directory === location().directory) invalidate()
    }),
    context.data.on('credential.switched', (event) => {
      if (event.data.integrationID !== 'opencode') return

      generation++
      setRevision((value) => value + 1)
    }),
    context.data.on('server.connected', () => {
      generation++
      setRevision((value) => value + 1)
    }),
  ]
  const adapter: ProviderQuotaAdapter = {
    id: 'opencode-usage',
    name: 'OpenCode workspace limits',
    supports: (model) =>
      typeof context.client.usage?.limits === 'function' && provider(model)?.integrationID === 'opencode',
    async read(model, signal) {
      signal.throwIfAborted()
      const epoch = generation
      const target = key()
      const activeProvider = provider(model)

      if (!activeProvider || activeProvider.integrationID !== 'opencode')
        throw new Error('Native usage provider changed')

      try {
        const result = await context.client.usage.limits({ location: { directory: location().directory } }, { signal })

        if (
          epoch !== generation ||
          target !== key() ||
          signal.aborted ||
          result.location.directory !== location().directory
        )
          throw new DOMException('Workspace usage target changed', 'AbortError')

        if (!result.data)
          return {
            model,
            providerId: model.providerID,
            providerName: activeProvider.name,
            fetchedAt: Date.now(),
            availability: 'unauthenticated',
            windows: [],
            message: 'Sign in to OpenCode Console to view workspace limits.',
          }

        const costs = context.data.location.model
          ?.list(location())
          ?.find((item) => item.providerID === model.providerID && item.id === model.modelID)?.cost

        return projectWorkspaceUsage(result.data, model, activeProvider, costs)
      } catch (error) {
        if (
          signal.aborted ||
          epoch !== generation ||
          target !== key() ||
          (error instanceof DOMException && error.name === 'AbortError')
        )
          throw error

        const status =
          (error as { status?: number; response?: { status?: number } })?.status ??
          (error as { response?: { status?: number } })?.response?.status
        const tag = (error as { _tag?: string })?._tag

        if (status === undefined && tag !== 'UnauthorizedError' && tag !== 'ForbiddenError')
          throw new Error('OpenCode workspace limits are unavailable. Refresh to retry the native source.', {
            cause: error,
          })

        const states = { 401: 'unauthenticated', 403: 'permission_required', 429: 'rate_limited' } as const
        let availability: 'unauthenticated' | 'permission_required' | 'rate_limited' | 'unavailable' = 'unavailable'

        if (status !== undefined && status in states) availability = states[status as keyof typeof states]

        if (tag === 'UnauthorizedError') availability = 'unauthenticated'
        else if (tag === 'ForbiddenError') availability = 'permission_required'

        return {
          model,
          providerId: model.providerID,
          providerName: activeProvider.name,
          fetchedAt: Date.now(),
          windows: [],
          availability,
          message: 'OpenCode workspace limits are unavailable. Refresh to retry the native source.',
        }
      }
    },
    dispose() {
      for (const dispose of disposers) dispose()
    },
  }

  return { adapter, target: (model: SelectedModel): SelectedModel => ({ ...model, quotaContext: key() }) }
}
