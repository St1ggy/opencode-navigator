export type SetupTarget = { key: string; sessionID: string; routing: { directory: string } }
export type ConfigDocument = { path?: string; experimental?: { todo?: boolean } }
export type TodoSetupSource = {
  entries(target: SetupTarget, signal: AbortSignal): Promise<ConfigDocument[]>
  read(target: SetupTarget, path: string, signal: AbortSignal): Promise<string>
  write(target: SetupTarget, path: string, text: string, signal: AbortSignal): Promise<void>
  subscribe(refresh: (directory?: string) => void): () => void
}
export type TodoSetupPreview = {
  target: SetupTarget
  route: string
  path: string
  original: string
  updated: string
  sources: string
}
