import { createSubagentModel } from './model/subagent-controller'
import { fetchDevTeamStatus } from './tui/remote-status'

import type { SubagentEvent, SubagentSource } from './model/source'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createSubagentController(
  api: TuiPluginApi,
  options: { now?: () => number; source?: SubagentSource } = {},
) {
  const source = options.source

  return createSubagentModel({
    now: options.now,
    lifecycle: api.lifecycle,
    cache: source ? 'source' : 'model',
    source: source ?? {
      list: () => [],
      status: (id) => api.state.session.status(id) ?? { type: 'idle' },
      refresh: async () => {},
    },
    target(parentID) {
      const parent = api.state.session.get(parentID)
      const directory = parent?.directory ?? api.state.path.directory
      const workspace = parent?.workspaceID

      return {
        key: JSON.stringify([parentID, directory, workspace ?? null]),
        parentID,
        routing: { directory, ...(workspace && { workspace }) },
      }
    },
    async snapshot(target, signal) {
      if (source) {
        await source.refresh(target.parentID, signal)
        const sessions = source.list(target.parentID)

        return {
          sessions,
          statuses: Object.fromEntries(sessions.map((session) => [session.id, source.status(session.id)])),
        }
      }

      const [children, statuses] = await Promise.all([
        api.client.session.children({ sessionID: target.parentID, ...target.routing }, { throwOnError: true, signal }),
        api.client.session.status(target.routing, { throwOnError: true, signal }),
      ])

      return { sessions: children.data ?? [], statuses: statuses.data ?? {} }
    },
    remoteStatus: source ? undefined : fetchDevTeamStatus,
    subscribe(listener: (event: SubagentEvent) => void) {
      const unsubscribe = [
        api.event.on('session.created', (event) => listener({ type: 'upsert', info: event.properties.info })),
        api.event.on('session.updated', (event) => listener({ type: 'upsert', info: event.properties.info })),
        api.event.on('session.deleted', (event) => listener({ type: 'remove', sessionID: event.properties.sessionID })),
        api.event.on('session.status', (event) => listener({ type: 'status', ...event.properties })),
        api.event.on('session.error', (event) => listener({ type: 'error', ...event.properties })),
        api.event.on('session.idle', (event) =>
          listener({ type: 'status', sessionID: event.properties.sessionID, status: { type: 'idle' } }),
        ),
        api.event.on('server.connected', () => listener({ type: 'reconnect' })),
      ]

      return () => {
        for (const dispose of unsubscribe) dispose()
      }
    },
    open: (sessionID) => api.route.navigate('session', { sessionID }),
  })
}
