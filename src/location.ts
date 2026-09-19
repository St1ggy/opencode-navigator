import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function currentLocation(api: TuiPluginApi) {
  const route = api.route.current
  const params = 'params' in route ? route.params : undefined
  const sessionID = typeof params?.sessionID === 'string' ? params.sessionID : undefined
  const session = sessionID ? api.state.session.get(sessionID) : undefined
  const directory = session?.directory ?? api.state.path.directory
  const workspace = session?.workspaceID

  return {
    key: JSON.stringify([directory, workspace ?? null]),
    routing: { directory, ...(workspace && { workspace }) },
  }
}
