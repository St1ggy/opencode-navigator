import type { SessionStatus } from '@opencode-ai/sdk/v2'

const TERMINAL_EVENTS = new Set([
  'session.execution.succeeded',
  'session.execution.failed',
  'session.execution.interrupted',
])

export function executionStatus(name: string, event: { type: string; data: Record<string, unknown> }) {
  const sessionID = event.data.sessionID
  const started = event.type === 'session.execution.started'

  if (typeof sessionID !== 'string' || (!started && !TERMINAL_EVENTS.has(event.type))) return

  if (name !== 'session.status' && (name !== 'session.idle' || started)) return

  const status: SessionStatus = started ? { type: 'busy' } : { type: 'idle' }

  return { sessionID, status, properties: { sessionID, ...(name === 'session.status' && { status }) } }
}
