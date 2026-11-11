import { sessionTarget } from '../../../shared/lib/location/identity'

import type { SessionTarget } from '../../../shared/lib/location/identity'
import type { MountedSession, SessionRef } from '@opencode/plugin/gui'

export type GuiSessionScope = { target: SessionTarget; visit: object }

function scopeFor(session: SessionRef | undefined, visit: object | undefined): GuiSessionScope | undefined {
  if (!session?.location || session.pending || !visit) return

  const target = sessionTarget({
    serverID: session.server.id,
    directory: session.location.directory,
    workspace: session.location.workspaceID,
    sessionID: session.id,
  })

  if (!target || ('directory' in session && target.directory !== session.directory)) return

  return { target, visit }
}

export function createSelectedSessionAccess(selected: () => MountedSession | undefined) {
  return createReferenceSessionAccess(() => {
    const reference = selected()

    return reference && { reference, visit: reference.visit }
  })
}

export function createReferenceSessionAccess(selected: () => { reference: SessionRef; visit: object } | undefined) {
  function capture() {
    const value = selected()

    return scopeFor(value?.reference, value?.visit)
  }

  function read(scope: GuiSessionScope, requireConnection = true) {
    const selection = selected()
    const session = selection?.reference
    const current = scopeFor(session, selection?.visit)

    if (!session || current?.target.sessionKey !== scope.target.sessionKey || current.visit !== scope.visit)
      throw new DOMException('Navigator session or server changed', 'AbortError')

    if (requireConnection && (!session.server.connected || !session.server.compatible))
      throw new Error('The selected OpenCode server is offline or incompatible')

    // Read fresh for each request, and invalidate this request's values on reconnect/authentication.
    const client = session.server.client
    const data = session.server.data

    return {
      client,
      data,
      location: session.location!,
      current() {
        const latest = selected()
        const live = latest?.reference

        return (
          Boolean(live) &&
          scopeFor(live, latest?.visit)?.target.sessionKey === scope.target.sessionKey &&
          latest?.visit === scope.visit &&
          live?.server.connected === true &&
          live.server.compatible &&
          live.server.client === client &&
          live.server.data === data
        )
      },
    }
  }

  return {
    capture,
    read,
    cache: (scope: GuiSessionScope) => read(scope, false),
    current(scope: GuiSessionScope) {
      const value = capture()

      return value?.target.sessionKey === scope.target.sessionKey && value.visit === scope.visit
    },
  }
}
