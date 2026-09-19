import { QUICK_ACTIONS } from './constants'
import { currentLocation } from './location'
import { mcpToggleAction } from './state'

import type { SkillInfo } from './controllers/skills'
import type { QuickActionId } from './quick-actions'
import type { SidebarSection } from './state'
import type { SubagentViewItem } from './subagent-view'
import type { TuiPluginApi, TuiSidebarMcpItem } from '@opencode-ai/plugin/tui'

export const SEARCH_GROUPS = ['Skills', 'Subagents', 'MCP', 'Actions'] as const
export type SearchGroup = (typeof SEARCH_GROUPS)[number]
export const SEARCH_SECTIONS: Record<SearchGroup, SidebarSection> = {
  Skills: 'skills',
  Subagents: 'subagents',
  MCP: 'mcp',
  Actions: 'quick_actions',
}
type SearchEntry = { id: string; title: string; description: string; keywords?: string; disabled?: string }
export type SearchResult = SearchEntry &
  (
    | { group: 'Skills'; skill: SkillInfo }
    | { group: 'Subagents'; sessionID: string }
    | { group: 'MCP'; server: string }
    | { group: 'Actions'; command: QuickActionId }
  )

export function searchContext(api: TuiPluginApi) {
  const route = api.route.current
  const sessionID =
    route.name === 'session' && 'params' in route && typeof route.params?.sessionID === 'string'
      ? route.params.sessionID
      : undefined
  const location = currentLocation(api)

  return { sessionID, location, key: JSON.stringify([route.name, sessionID ?? null, location.key]) }
}

export function buildSearchCandidates(input: {
  skills: readonly SkillInfo[]
  subagents: readonly SubagentViewItem[]
  mcp: readonly TuiSidebarMcpItem[]
  actionOrder: readonly QuickActionId[]
  favoriteSkills: ReadonlySet<string>
  recentSkills: readonly string[]
  favoriteMcp: ReadonlySet<string>
  hasSession: boolean
  mcpBusy: boolean
}): SearchResult[] {
  const recent = new Map(input.recentSkills.map((location, index) => [location, index]))
  const skills = [...input.skills].sort(
    (a, b) =>
      Number(input.favoriteSkills.has(b.location)) - Number(input.favoriteSkills.has(a.location)) ||
      (recent.get(a.location) ?? Infinity) - (recent.get(b.location) ?? Infinity) ||
      a.name.localeCompare(b.name),
  )
  const mcp = [...input.mcp].sort(
    (a, b) =>
      Number(input.favoriteMcp.has(b.name)) - Number(input.favoriteMcp.has(a.name)) || a.name.localeCompare(b.name),
  )
  const results: SearchResult[] = [
    ...skills.map((skill): SearchResult => ({
      id: `skill:${skill.location || skill.name}`,
      group: 'Skills',
      title: skill.name,
      description: skill.description?.trim() || skill.location,
      keywords: skill.location,
      skill,
    })),
    ...input.subagents.map((item): SearchResult => ({
      id: `subagent:${item.session.id}`,
      group: 'Subagents',
      title: item.session.title,
      description: [item.run?.outcome ?? item.status.type, item.run?.errorMessage].filter(Boolean).join(' · '),
      keywords: item.session.id,
      sessionID: item.session.id,
    })),
    ...mcp.map((item): SearchResult => ({
      id: `mcp:${item.name}`,
      group: 'MCP',
      title: item.name,
      description: [mcpToggleAction(item.status) === 'disconnect' ? 'Disconnect' : 'Connect', item.status, item.error]
        .filter(Boolean)
        .join(' · '),
      disabled: input.mcpBusy || !mcpToggleAction(item.status) ? 'MCP operation in progress' : undefined,
      server: item.name,
    })),
    ...input.actionOrder.flatMap((id): SearchResult[] => {
      const action = QUICK_ACTIONS.find((item) => item.command === id)

      return action
        ? [
            {
              id: `action:${id}`,
              group: 'Actions',
              title: action.label,
              description: id,
              command: id,
              disabled: input.hasSession ? undefined : 'Requires an open session',
            },
          ]
        : []
    }),
  ]

  return [...new Map(results.map((item) => [item.id, item])).values()]
}

function fuzzyScore(needle: string, value: string) {
  const text = value.toLocaleLowerCase()
  const position = text.indexOf(needle)

  if (text === needle) return 2000

  if (position === 0) return 1500

  if (position !== -1) return 1000 - position

  let cursor = 0
  let gaps = 0

  for (const char of needle) {
    const index = text.indexOf(char, cursor)

    if (index === -1) return -1

    gaps += index - cursor
    cursor = index + char.length
  }

  return Math.max(0, 500 - gaps)
}

export function searchResults(candidates: readonly SearchResult[], query: string): SearchResult[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const scored = candidates.flatMap((item, index) => {
    let score = 0

    for (const term of terms) {
      const title = fuzzyScore(term, item.title)
      const detail = fuzzyScore(term, `${item.description} ${item.keywords ?? ''}`)

      if (title < 0 && detail < 0) return []

      score += Math.max(title >= 0 ? title : -Infinity, detail >= 0 ? detail - 250 : -Infinity)
    }

    return [{ item, score, index }]
  })

  scored.sort(
    (a, b) =>
      SEARCH_GROUPS.indexOf(a.item.group) - SEARCH_GROUPS.indexOf(b.item.group) ||
      b.score - a.score ||
      a.index - b.index,
  )

  return scored.map(({ item }) => item)
}
