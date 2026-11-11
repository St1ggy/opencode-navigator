import { preferencesScope } from '../../../shared/config'
import { sessionTarget } from '../../../shared/lib/location/identity'

import type { SessionRef } from '@opencode/plugin/gui'

export function guiPreferenceScope(session: SessionRef | undefined) {
  if (!session?.location || session.pending) return 'global'

  const scope = sessionTarget({
    serverID: session.server.id,
    directory: session.location.directory,
    workspace: session.location.workspaceID,
    sessionID: session.id,
  })

  if (!scope || ('directory' in session && session.directory !== scope.directory)) return 'global'

  // Match the 2.x TUI adapter's effective location directory, not the parent project's root.
  const path = preferencesScope({ directory: scope.directory })

  return session.server.local ? path : JSON.stringify([scope.serverID, path])
}
