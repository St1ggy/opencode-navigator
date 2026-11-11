import type { SubagentError, SubagentSession, SubagentStatus } from './types'

export type SubagentTarget = {
  key: string
  parentID: string
  routing: { directory: string; workspace?: string }
}

export type SubagentEvent =
  | { type: 'upsert'; info: SubagentSession }
  | { type: 'remove'; sessionID: string }
  | { type: 'status'; sessionID: string; status: SubagentStatus }
  | { type: 'error'; sessionID?: string; error?: SubagentError }
  | { type: 'reconnect' }

export type RemoteSubagentStatus = { sessionID: string; status?: SubagentStatus; failed?: boolean }

export type SubagentSource = {
  list(parentID: string): readonly SubagentSession[]
  status(sessionID: string): SubagentStatus
  startedAt?(sessionID: string): number | undefined
  refresh(parentID: string, signal: AbortSignal): Promise<void>
}
