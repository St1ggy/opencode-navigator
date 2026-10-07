import { createSignal, untrack } from 'solid-js'

import { providerAccountIdentity } from './provider-account'

import type { HostProviderConnection, ProviderAccountSource, SelectedModel } from '../../entities/provider-limit'
import type { Plugin } from '@opencode/plugin/tui'

export function createOpenCodeV2AccountSource(context: Plugin.Context, lifecycle: AbortSignal): ProviderAccountSource {
  const [connections, setConnections] = createSignal<Record<string, HostProviderConnection>>({})
  let generation = 0
  let disposed = false
  let lastModel: SelectedModel | undefined
  let pending: { key: string; generation: number; promise: Promise<HostProviderConnection> } | undefined
  const location = () => context.location ?? context.data.location.default()
  const key = (model: SelectedModel) => JSON.stringify([model.providerID, location()])

  function save(target: string, connection: HostProviderConnection) {
    if (JSON.stringify(connections()[target]) !== JSON.stringify(connection))
      setConnections((values) => ({ ...values, [target]: connection }))
  }

  async function read(model: SelectedModel, signal = lifecycle): Promise<HostProviderConnection> {
    if (disposed || signal.aborted) return { status: 'unavailable' }

    const target = key(model)
    const epoch = generation

    if (pending?.key === target && pending.generation === epoch) return pending.promise

    const promise = (async (): Promise<HostProviderConnection> => {
      try {
        if (!context.client.provider?.get || !context.client.credential?.list)
          throw new Error('Account metadata unavailable')

        const options = { signal: AbortSignal.any([lifecycle, signal]) }
        const [provider, credentials] = await Promise.all([
          context.client.provider.get({ providerID: model.providerID, location: location() }, options),
          context.client.credential.list(options),
        ])
        let connection =
          provider.data.id === model.providerID
            ? providerAccountIdentity(provider.data, credentials)
            : { status: 'unavailable' as const }

        if (
          connection.status === 'unavailable' &&
          credentials.every((entry) => !(entry.integrationID === provider.data.integrationID && entry.active)) &&
          provider.data.integrationID &&
          typeof context.client.integration?.get === 'function'
        ) {
          const integration = await context.client.integration.get(
            { integrationID: provider.data.integrationID, location: location() },
            options,
          )
          const active = integration.data.connections[0]

          if (active?.type === 'env' && !active.status)
            connection = {
              status: 'ready',
              id: `env:${active.name}`,
              method: 'api',
              providerID: provider.data.canonical ?? provider.data.id,
            }
        }

        if (disposed || signal.aborted || epoch !== generation || key(model) !== target)
          return { status: 'unavailable' }

        save(target, connection)

        return connection
      } catch {
        if (!disposed && !signal.aborted && epoch === generation) save(target, { status: 'unavailable' })

        return { status: 'unavailable' }
      }
    })()

    pending = { key: target, generation: epoch, promise }
    try {
      return await promise
    } finally {
      if (pending?.promise === promise) pending = undefined
    }
  }

  function invalidate(eager = true) {
    generation++

    if (eager) setConnections({})
    else {
      const active = lastModel && key(lastModel)

      setConnections((values) => Object.fromEntries(Object.entries(values).filter(([target]) => target === active)))
    }

    if (lastModel && !disposed) void read(lastModel)
  }

  const events = [
    'credential.switched',
    'credential.updated',
    'integration.updated',
    'provider.updated',
    'server.connected',
  ] as const
  const unsubscribes = events.map((event) =>
    context.data.on(event, () => untrack(() => invalidate(event !== 'provider.updated'))),
  )

  return {
    current(model) {
      lastModel = model

      return { ...model, hostConnection: connections()[key(model)] ?? { status: 'loading' } }
    },
    async refresh(model) {
      await read(model)
    },
    async validate(model, signal) {
      const actual = await read(model, signal)
      const expected = model.hostConnection

      return (
        actual.status === 'ready' &&
        expected?.status === 'ready' &&
        actual.id === expected.id &&
        actual.accountID === expected.accountID &&
        (!actual.accountID || actual.accountID === model.accountID)
      )
    },
    dispose() {
      disposed = true
      generation++
      for (const unsubscribe of unsubscribes) unsubscribe()
    },
  }
}
