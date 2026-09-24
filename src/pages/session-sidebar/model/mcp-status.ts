import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function mcpColor(api: TuiPluginApi, status: string) {
  const theme = api.theme.current

  if (status === 'connected') return theme.success

  if (status === 'failed' || status === 'needs_client_registration') return theme.error

  if (status === 'needs_auth') return theme.warning

  return theme.textMuted
}

export function mcpToggle(status: string, busy: boolean) {
  if (busy || status === 'pending') return 'pending'

  return status === 'connected' ? 'connected' : 'disconnected'
}
