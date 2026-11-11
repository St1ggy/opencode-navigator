export type SubagentSession = {
  id: string
  parentID?: string
  title: string
  directory: string
  workspaceID?: string
  metadata?: Record<string, unknown>
  time: { created: number; updated: number }
}

export type SubagentStatus =
  | { type: 'idle' }
  | { type: 'busy' }
  | { type: 'retry'; attempt: number; message: string; next: number }

export type SubagentError = { name: string; data?: unknown }
