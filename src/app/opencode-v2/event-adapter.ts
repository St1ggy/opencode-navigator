import type { createV2SessionAdapter } from './session-adapter'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type SessionAdapter = ReturnType<typeof createV2SessionAdapter>
type LegacyEventBus = TuiPluginApi['event']

const SESSION_UPDATE_EVENTS = new Set([
  'session.agent.selected',
  'session.model.selected',
  'session.moved',
  'session.renamed',
  'session.permissions',
])

export function createV2EventAdapter(context: Plugin.Context, sessions: SessionAdapter) {
  return {
    on(name: string, handler: (event: unknown) => void) {
      let active = true
      const unsubscribe = context.data.listen(({ details }) => {
        const event = details as { type: string; data: Record<string, unknown> }

        if (name === 'server.connected' && event.type === 'server.connected') {
          handler({ type: name, properties: {} })

          return
        }

        if (name === 'mcp.tools.changed' && event.type.startsWith('mcp.')) {
          handler({ type: name, properties: event.data })

          return
        }

        if (name === 'installation.update-available' && event.type === 'installation.update-available') {
          if (typeof event.data.version === 'string') {
            handler({ type: name, properties: { version: event.data.version } })
          }

          return
        }

        if (name === 'session.deleted' && event.type === 'session.deleted') {
          handler({ type: name, properties: { sessionID: event.data.sessionID } })

          return
        }

        if (name === 'session.status' && event.type === 'session.status') {
          const sessionID = event.data.sessionID
          const status = event.data.status

          if (typeof sessionID !== 'string' || !status || typeof status !== 'object') return

          sessions.setStatus(sessionID, status as never)
          handler({ type: name, properties: { sessionID, status } })

          return
        }

        if (name === 'session.idle' && event.type === 'session.idle') {
          const sessionID = event.data.sessionID

          if (typeof sessionID !== 'string') return

          sessions.setStatus(sessionID, { type: 'idle' })
          handler({ type: name, properties: { sessionID } })

          return
        }

        if (name === 'session.error' && event.type === 'session.execution.failed') {
          const error = event.data.error as { type?: string; message?: string } | undefined

          handler({
            type: name,
            properties: {
              sessionID: event.data.sessionID,
              error: error && { name: error.type ?? 'Error', data: { message: error.message ?? 'Session error' } },
            },
          })

          return
        }

        const isCreated = name === 'session.created' && event.type === 'session.created'
        const isUpdated = name === 'session.updated' && SESSION_UPDATE_EVENTS.has(event.type)

        if (!isCreated && !isUpdated) return

        const sessionID = event.data.sessionID
        const info = typeof sessionID === 'string' ? context.data.session.get(sessionID) : undefined

        if (info) {
          handler({ type: name, properties: { info: sessions.normalize(info) } })

          return
        }

        if (typeof sessionID !== 'string') return

        void context.data.session
          .sync(sessionID)
          .then(() => {
            const synced = context.data.session.get(sessionID)

            if (active && synced) handler({ type: name, properties: { info: sessions.normalize(synced) } })
          })
          .catch(() => {})
      })

      return () => {
        active = false
        unsubscribe()
      }
    },
  } as unknown as LegacyEventBus
}
