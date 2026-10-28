import { executionStatus } from './session-status'

import type { createV2SessionAdapter } from './session-adapter'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type NativeEvent = Parameters<Plugin.Context['data']['on']>[0]
type EventData = { type: string; data: Record<string, unknown> }
const updates = [
  'session.agent.selected',
  'session.model.selected',
  'session.moved',
  'session.renamed',
  'session.permissions',
  'session.metadata.updated',
] as const
const executions = [
  'session.execution.started',
  'session.execution.succeeded',
  'session.execution.failed',
  'session.execution.interrupted',
] as const

function eventTypes(name: string): readonly NativeEvent[] {
  if (name === 'session.updated') return updates

  if (name === 'session.status') return ['session.status', 'session.retry.scheduled', ...executions]

  if (name === 'session.idle') return ['session.idle', ...executions.slice(1)]

  if (name === 'session.error') return ['session.execution.failed']

  if (name === 'mcp.tools.changed') return ['mcp.status.changed', 'mcp.resources.changed']

  if (['session.created', 'session.deleted', 'server.connected', 'installation.update-available'].includes(name))
    return [name as NativeEvent]

  return []
}

function statusFor(name: string, event: EventData) {
  if (name === 'session.idle') return { type: 'idle' }

  if (event.type === 'session.retry.scheduled')
    return {
      type: 'retry',
      attempt: Number(event.data.attempt),
      next: Number(event.data.at),
      message: (event.data.error as { message?: string })?.message ?? 'Retrying',
    }

  return event.data.status
}

export function createV2EventAdapter(context: Plugin.Context, sessions: ReturnType<typeof createV2SessionAdapter>) {
  return {
    on(name: string, handler: (event: unknown) => void) {
      let active = true
      const disposers = eventTypes(name).map((type) =>
        context.data.on(type, (value) => {
          const event = value as unknown as EventData
          const data = event.data ?? {}
          const emit = (properties: unknown) => {
            if (active) handler({ type: name, properties })
          }
          const execution = executionStatus(name, { type: event.type, data })

          if (execution) {
            sessions.setStatus(execution.sessionID, execution.status)
            emit(execution.properties)

            return
          }

          if (name === 'server.connected' || name === 'mcp.tools.changed') {
            emit(data)

            return
          }

          if (name === 'installation.update-available') {
            if (typeof data.version === 'string') emit({ version: data.version })

            return
          }

          const sessionID = data.sessionID

          if (typeof sessionID !== 'string') return

          if (name === 'session.status' || name === 'session.idle') {
            const status = statusFor(name, { type: event.type, data })

            if (status && typeof status === 'object') {
              sessions.setStatus(sessionID, status as never)
              emit(name === 'session.idle' ? { sessionID } : { sessionID, status })
            }

            return
          }

          if (name === 'session.deleted') {
            emit({ sessionID })

            return
          }

          if (name === 'session.error') {
            const error = data.error as { type?: string; message?: string } | undefined

            emit({
              sessionID,
              error: error && { name: error.type ?? 'Error', data: { message: error.message ?? 'Session error' } },
            })

            return
          }

          const info = context.data.session.get(sessionID)

          if (info) {
            emit({ info: sessions.project(info) })

            return
          }

          void context.data.session
            .sync(sessionID)
            .then(() => {
              const synced = context.data.session.get(sessionID)

              if (synced) emit({ info: sessions.project(synced) })
            })
            .catch(() => {})
        }),
      )

      return () => {
        active = false
        for (const dispose of disposers) dispose()
      }
    },
  } as unknown as TuiPluginApi['event']
}
