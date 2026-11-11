import { createMemo, createSignal } from 'solid-js'

import { buildMcpGroupedView } from '../../../entities/mcp/model'
import { orderQuickActionIds } from '../../../entities/quick-action/model'
import { buildSkillGroupedView } from '../../../entities/skill/model'
import { createListVisibility } from '../../../shared/lib/list-visibility'
import { matchesFilter } from '../../../shared/lib/text-filter'

import type { McpController } from '../../../entities/mcp/model'
import type { PreferencesController } from '../../../entities/preferences/model'
import type { QuickActionId, QuickActionState } from '../../../entities/quick-action/model'
import type { SkillController } from '../../../entities/skill/model'

export function createCatalogViews(ports: {
  skills: Pick<SkillController, 'list'>
  mcp: Pick<McpController, 'list'>
  preferences: Pick<
    PreferencesController,
    | 'favoriteSkills'
    | 'skillGroups'
    | 'recentSkills'
    | 'favoriteMcpServers'
    | 'mcpServerGroups'
    | 'sectionItemLimit'
    | 'quickActionOrder'
    | 'favoriteQuickActions'
    | 'quickActionVisible'
  >
  scope: string
  actionState(id: QuickActionId): QuickActionState
}) {
  const preferences = ports.preferences
  const [skillQuery, setSkillQuery] = createSignal('')
  const [mcpQuery, setMcpQuery] = createSignal('')
  const [actionQuery, setActionQuery] = createSignal('')
  const actions = createMemo(() =>
    orderQuickActionIds(preferences.quickActionOrder(), preferences.favoriteQuickActions()).filter((id) =>
      preferences.quickActionVisible(id),
    ),
  )
  const actionFiltered = createMemo(() =>
    actions().filter((id) => matchesFilter(actionQuery(), ports.actionState(id).label, id)),
  )
  const actionVisibility = createListVisibility({
    items: actionFiltered,
    limit: () => preferences.sectionItemLimit('quick_actions'),
    resetKey: () => JSON.stringify([ports.scope, actionQuery()]),
  })
  const skills = createMemo(() =>
    buildSkillGroupedView(
      ports.skills.list(),
      preferences.favoriteSkills(),
      preferences.skillGroups(),
      new Map(preferences.recentSkills().map((location, index) => [location, index])),
    ),
  )
  const mcp = createMemo(() =>
    buildMcpGroupedView(ports.mcp.list(), preferences.favoriteMcpServers(), preferences.mcpServerGroups()),
  )
  const skillFiltered = createMemo(() =>
    skills().filter((item) => matchesFilter(skillQuery(), item.name, item.description, item.assignedGroup)),
  )
  const mcpFiltered = createMemo(() =>
    mcp().filter((item) => matchesFilter(mcpQuery(), item.name, item.title, item.assignedGroup)),
  )
  const skillVisibility = createListVisibility({
    items: skillFiltered,
    limit: () => preferences.sectionItemLimit('skills'),
    resetKey: () => JSON.stringify([ports.scope, skillQuery()]),
  })
  const mcpVisibility = createListVisibility({
    items: mcpFiltered,
    limit: () => preferences.sectionItemLimit('mcp'),
    resetKey: () => JSON.stringify([ports.scope, mcpQuery()]),
  })

  return {
    actions: {
      all: actions,
      query: actionQuery,
      setQuery: setActionQuery,
      filtered: actionFiltered,
      visibility: actionVisibility,
    },
    skills: {
      all: skills,
      query: skillQuery,
      setQuery: setSkillQuery,
      filtered: skillFiltered,
      visibility: skillVisibility,
      groups: () => [...new Set(skillVisibility.visible().map((item) => item.bucket))],
    },
    mcp: {
      all: mcp,
      query: mcpQuery,
      setQuery: setMcpQuery,
      filtered: mcpFiltered,
      visibility: mcpVisibility,
      groups: () => [...new Set(mcpVisibility.visible().map((item) => item.bucket))],
      bucket: (group: string) => mcp().filter((item) => item.bucket === group),
    },
  }
}
