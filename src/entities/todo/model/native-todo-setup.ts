export type NativeTodoSetupState = {
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
  enabled?: boolean
  error?: string
}

export type NativeTodoSetup = {
  state(sessionID: string): NativeTodoSetupState
  refresh(sessionID: string): Promise<void>
  configure(sessionID: string): void
}
