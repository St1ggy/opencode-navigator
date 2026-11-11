import type { RemoteSubagentStatus } from '../model/source'
import type { SubagentSession, SubagentStatus } from '../model/types'

export async function fetchDevTeamStatus(
  session: SubagentSession,
  signal: AbortSignal,
): Promise<RemoteSubagentStatus | undefined> {
  const metadata = session.metadata
  const devTeam = metadata && typeof metadata.devTeam === 'object' ? metadata.devTeam : undefined
  const serverUrl = devTeam && 'serverUrl' in devTeam ? devTeam.serverUrl : undefined

  if (typeof serverUrl !== 'string') return

  try {
    const url = new URL('/session/status', serverUrl)

    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return

    url.searchParams.set('directory', session.directory)
    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]),
    })

    if (!response.ok) return { sessionID: session.id, failed: true }

    const statuses: unknown = await response.json()

    if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses))
      return { sessionID: session.id, failed: true }

    const status = (statuses as Record<string, unknown>)[session.id]

    if (
      status !== undefined &&
      (!status ||
        typeof status !== 'object' ||
        !('type' in status) ||
        !['idle', 'busy', 'retry'].includes(String(status.type)))
    )
      return { sessionID: session.id, failed: true }

    if (
      status &&
      typeof status === 'object' &&
      'type' in status &&
      status.type === 'retry' &&
      (!('next' in status) ||
        typeof status.next !== 'number' ||
        !Number.isFinite(status.next) ||
        !('attempt' in status) ||
        typeof status.attempt !== 'number' ||
        !('message' in status) ||
        typeof status.message !== 'string')
    )
      return { sessionID: session.id, failed: true }

    return { sessionID: session.id, status: status as SubagentStatus | undefined }
  } catch {
    if (signal.aborted) return

    return { sessionID: session.id, failed: true }
  }
}
