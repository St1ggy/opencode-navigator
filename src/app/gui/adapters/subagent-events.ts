import { createEffect, onCleanup, untrack } from 'solid-js'

import type { SubagentEvent, SubagentStatus } from '../../../entities/subagent/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'
import type { createGuiSubagentSource } from './subagent-source'

const noop = () => {}

const updates = new Set(['session.created', 'session.renamed', 'session.moved', 'session.metadata.updated'])
const terminal = new Set([
  'session.execution.succeeded',
  'session.execution.failed',
  'session.execution.interrupted',
  'session.idle',
])

type Data = ReturnType<ReturnType<typeof createSelectedSessionAccess>['cache']>['data']
type DataEvent = Parameters<Parameters<Data['listen']>[0]>[0]['details']

function eventStatus(event: DataEvent): SubagentStatus | undefined {
  if (event.type === 'session.status') return event.data.status

  if (event.type === 'session.retry.scheduled')
    return { type: 'retry', attempt: event.data.attempt, next: event.data.at, message: event.data.error.message }

  if (event.type === 'session.execution.started') return { type: 'busy' }

  if (terminal.has(event.type)) return { type: 'idle' }

  return undefined
}

export function subscribeGuiSubagents(input: {
  access: ReturnType<typeof createSelectedSessionAccess>
  scope: GuiSessionScope
  source: ReturnType<typeof createGuiSubagentSource>
  listener(event: SubagentEvent): void
}) {
  let stopped = false
  let cleanup = noop
  let previous: object | undefined

  createEffect(() => {
    if (stopped || !input.access.current(input.scope)) return

    const data = input.access.cache(input.scope).data
    const members = new Set(untrack(() => input.source.list(input.scope.target.sessionID).map((item) => item.id)))
    const emit = input.listener

    if (previous !== data) input.source.clearObservedStatuses()

    if (previous && previous !== data) emit({ type: 'reconnect' })

    previous = data
    cleanup = data.listen(({ details: event }) => {
      if (stopped || !input.access.current(input.scope)) return

      if (event.type === 'server.connected') {
        emit({ type: 'reconnect' })

        return
      }

      if (!('sessionID' in event.data) || typeof event.data.sessionID !== 'string') return

      const id = event.data.sessionID
      const info = data.session.get(id)
      const createdHere = event.type === 'session.created' && event.data.parentID === input.scope.target.sessionID

      if (createdHere || info?.parentID === input.scope.target.sessionID) members.add(id)

      if (!members.has(id)) return

      if (event.type === 'session.deleted') {
        members.delete(id)
        emit({ type: 'remove', sessionID: id })

        return
      }

      const status = eventStatus(event)

      if (event.type === 'session.execution.failed' || event.type === 'session.execution.interrupted') {
        const error = 'error' in event.data ? event.data.error : undefined

        emit({
          type: 'error',
          sessionID: id,
          error: {
            name: event.type === 'session.execution.interrupted' ? 'MessageAbortedError' : (error?.type ?? 'Error'),
            data: { message: error?.message ?? 'Session interrupted' },
          },
        })
      }

      if (status) {
        input.source.observeStatus(id, status)
        emit({ type: 'status', sessionID: id, status })
      }

      if (updates.has(event.type)) {
        const publish = () => {
          const value = input.source.list(input.scope.target.sessionID).find((item) => item.id === id)

          if (!stopped && input.access.current(input.scope) && value) emit({ type: 'upsert', info: value })
        }

        if (info) publish()
        else
          void data.session
            .sync(id)
            .then(publish)
            .catch(() => {})
      }
    })
    onCleanup(cleanup)
  })

  return () => {
    stopped = true
    cleanup()
  }
}
