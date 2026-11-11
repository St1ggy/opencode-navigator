export type McpItem = {
  name: string
  status: 'connected' | 'disabled' | 'failed' | 'needs_auth' | 'needs_client_registration' | 'pending'
  error?: string
  title?: string
}

export type McpSource = {
  list(target: { routing: { directory?: string; workspace?: string } }): readonly McpItem[]
  refresh(
    target: { routing: { directory?: string; workspace?: string } },
    force: boolean,
    signal: AbortSignal,
  ): Promise<readonly McpItem[]>
}

export type McpTarget = {
  key: string
  scope: string
  routing: { directory: string; workspace?: string }
}

export type McpMutation = (
  target: McpTarget,
  name: string,
  action: 'connect' | 'disconnect',
  signal: AbortSignal,
) => Promise<void>
