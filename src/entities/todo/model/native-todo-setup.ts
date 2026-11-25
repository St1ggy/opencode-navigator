export type NativeTodoSetupState = {
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
  enabled?: boolean
  error?: string
  configurationUnavailable?: string
  enableUnavailable?: string
}

export type NativeTodoSetup = {
  state(sessionID: string): NativeTodoSetupState
  refresh(sessionID: string): Promise<void>
  configure(sessionID: string): void
}
