import { preferencesScope } from '../../shared/config'
import { currentLocation } from '../../shared/lib/location'

import { createMcpModel } from './model/mcp-controller'

import type { McpPreferencesAccess } from './model/mcp-controller'
import type { McpSource } from './model/source'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createMcpController(
  api: TuiPluginApi,
  persist: () => boolean,
  preferences: McpPreferencesAccess,
  source?: McpSource,
) {
  return createMcpModel(
    {
      target() {
        const location = currentLocation(api)

        return {
          ...location,
          scope: preferencesScope({ directory: location.routing.directory, worktree: api.state.path.worktree }),
        }
      },
      signal: api.lifecycle?.signal,
      notifications: { show: (input) => api.ui.toast({ ...input, duration: 4000 }) },
      cache: source ? 'source' : 'model',
      source: source ?? {
        list: () => api.state.mcp(),
        async refresh(target, _force, signal) {
          const result = await api.client.mcp.status(target.routing, { throwOnError: true, signal })

          return Object.entries(result.data ?? {})
            .map(([name, status]) => ({
              name,
              status: status.status,
              error: 'error' in status ? status.error : undefined,
            }))
            .sort((left, right) => left.name.localeCompare(right.name))
        },
      },
      async change(target, name, action, signal) {
        await api.client.mcp[action]({ name, ...target.routing }, { throwOnError: true, signal })
      },
    },
    persist,
    preferences,
  )
}
