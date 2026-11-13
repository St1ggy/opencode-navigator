export type ExecuteRun = {
  id: string
  messageID: string
  status: 'streaming' | 'running' | 'completed' | 'error'
  created: number
  started?: number
  completed?: number
  input: unknown
  output?: unknown
  error?: unknown
  nested: 'unavailable'
}

export type CodeModeTarget = {
  key: string
  sessionID: string
  directory: string
}

export type RoutingEntry = {
  path?: string
  servers?: Record<string, unknown>
}

export type RoutingState = {
  mode: 'code' | 'direct' | 'unknown'
  explicit: boolean
  source?: string
  reason?: string
}

export type RoutingPreview = {
  connection: object
  target: CodeModeTarget
  server: string
  path: string
  mode: 'code' | 'direct'
  before: string
  after: string
}

export type CodeModeSource = {
  identity?(): object
  supported: boolean
  reason?: string
  runs(): ExecuteRun[]
  refresh(signal: AbortSignal): Promise<void>
  entries(signal: AbortSignal): Promise<RoutingEntry[]>
  read(path: string, signal: AbortSignal): Promise<string>
  write(path: string, text: string, signal: AbortSignal): Promise<void>
  current(): boolean
  subscribe(listener: (kind: 'activity' | 'configuration') => void): () => void
}

export type CodeModeController = ReturnType<typeof createCodeModeController>

import type { createCodeModeController } from './controller'
