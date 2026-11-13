import { buildSubagentView } from '../../../entities/subagent/model'
import { buildSearchCandidates, createSearchViewState } from '../../../features/search-everything/model'

import type { SubagentController } from '../../../entities/subagent/model'
import type { CatalogRuntime } from './catalog-runtime'

export function createNavigatorSearch(catalogs: CatalogRuntime, subagents: SubagentController, sessionID: string) {
  const preferences = catalogs.preferences

  return createSearchViewState(() =>
    buildSearchCandidates({
      skills: catalogs.skills.list(),
      mcp: catalogs.mcp.list(),
      subagents: buildSubagentView(subagents.list(sessionID), subagents.recent(sessionID)),
      actionOrder: preferences.quickActionOrder(),
      favoriteQuickActions: preferences.favoriteQuickActions(),
      favoriteSkills: preferences.favoriteSkills(),
      skillGroups: preferences.skillGroups(),
      recentSkills: preferences.recentSkills(),
      favoriteMcp: preferences.favoriteMcpServers(),
      mcpGroups: preferences.mcpServerGroups(),
      hasSession: true,
      mcpErrorMode: 'details',
      mcpBusy: catalogs.mcp.mutating(),
      mcpPending: (name) => ['loading', 'refreshing'].includes(catalogs.mcp.serverState(name).status),
      actionLabel: (action) => catalogs.actionState(action.command).label,
      actionDisabledReason: (action) => catalogs.actionState(action.command).reason,
    }),
  )
}
