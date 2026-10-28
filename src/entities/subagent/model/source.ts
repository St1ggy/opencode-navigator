import type { Session, SessionStatus } from '@opencode-ai/sdk/v2'

export type SubagentSource = {
  list(parentID: string): readonly Session[]
  status(sessionID: string): SessionStatus
  refresh(parentID: string, signal: AbortSignal): Promise<void>
}
