import { createLayoutPresetPreview, createMcpPresetPreview } from './preset-preview'

import type { McpController } from '../../../entities/mcp/model'
import type { PreferencesController } from '../../../entities/preferences/model'

const alwaysCurrent = () => true

export function createWorkspacePresetPreview(
  preferences: PreferencesController,
  name: string,
  controller?: McpController,
  current = alwaysCurrent,
) {
  const layout = createLayoutPresetPreview(preferences, name)
  const linked = preferences.workspaceProfiles()[name]
  const mcp = controller && linked ? createMcpPresetPreview(controller, preferences, linked, current) : undefined
  const valid = () =>
    current() && layout.valid() && preferences.workspaceProfiles()[name] === linked && (!mcp || mcp.valid())
  const blocked = () => {
    if (!valid()) return 'Profile, scope, session or server changed. Reopen the preview.'

    if (linked && !mcp) return 'Open the matching server session before applying its linked MCP preset.'

    return layout.blocked() || mcp?.blocked() || ''
  }

  return {
    layout,
    mcp,
    linked,
    valid,
    blocked,
    apply() {
      if (blocked()) return

      const request = mcp?.apply()

      if (mcp && !request) return

      if (!layout.apply()) return

      return Promise.resolve(request).then(() => {
        if (controller && mcp && controller.bulkState().failed.length > 0)
          throw new Error('Layout applied, but some MCP servers could not change. Review MCP failures and retry them.')
      })
    },
  }
}
