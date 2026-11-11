import { untrack } from 'solid-js'

import { createProviderAccountSource } from '../../features/provider-limits/model'

import { providerAccountIdentity } from './provider-account'

import type { HostProviderConnection } from '../../entities/provider-limit/model'
import type { Plugin } from '@opencode/plugin/tui'

export function createOpenCodeV2AccountSource(context: Plugin.Context, lifecycle: AbortSignal) {
  const location = () => context.location ?? context.data.location.default()

  return createProviderAccountSource({
    lifecycle,
    key: (model) => JSON.stringify([model.providerID, location()]),
    async read(model, signal): Promise<HostProviderConnection> {
      if (!context.client.provider?.get || !context.client.credential?.list)
        throw new Error('Account metadata unavailable')

      const options = { signal }
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

      return connection
    },
    subscribe(invalidate) {
      const events = [
        'credential.switched',
        'credential.updated',
        'integration.updated',
        'provider.updated',
        'server.connected',
      ] as const
      const cleanups = events.map((event) =>
        context.data.on(event, (observation) =>
          untrack(() => {
            const directory = observation?.location?.directory

            if (
              (event === 'provider.updated' || event === 'integration.updated') &&
              directory &&
              directory !== location().directory
            )
              return

            invalidate(event !== 'provider.updated')
          }),
        ),
      )

      return () => {
        for (const cleanup of cleanups) cleanup()
      }
    },
  })
}
