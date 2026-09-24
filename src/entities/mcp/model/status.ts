export function mcpToggleAction(status: string): 'connect' | 'disconnect' | undefined {
  if (status === 'pending') return

  return status === 'connected' ? 'disconnect' : 'connect'
}
