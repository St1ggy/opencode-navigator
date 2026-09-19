import { expect, test } from 'bun:test'

import { QUICK_ACTION_IDS } from '../src/quick-actions'
import { SEARCH_GROUPS, buildSearchCandidates, searchResults } from '../src/search'

test('Search Everything ranks fuzzy matches within groups and searches source paths', () => {
  const candidates = buildSearchCandidates({
    skills: ['review-code', 'review', 'favorite'].map((name) => ({
      name,
      location: `/skills/${name}/SKILL.md`,
      content: '',
      description: 'Inspect changes',
    })),
    subagents: [],
    mcp: [{ name: 'review-mcp', status: 'connected' }],
    actionOrder: QUICK_ACTION_IDS,
    favoriteSkills: new Set(['/skills/favorite/SKILL.md']),
    recentSkills: [],
    favoriteMcp: new Set(),
    hasSession: true,
    mcpBusy: false,
  })

  expect(searchResults(candidates, '')[0].title).toBe('favorite')
  expect(searchResults(candidates, 'review').map((item) => item.title)).toEqual(['review', 'review-code', 'review-mcp'])
  expect(searchResults(candidates, 'rvwcd')[0].title).toBe('review-code')
  expect(searchResults(candidates, 'review-code SKILL.md').map((item) => item.title)).toEqual(['review-code'])
  expect(searchResults(candidates, 'nothinghere')).toEqual([])
  const groupOrder = searchResults(candidates, '').map((item) => SEARCH_GROUPS.indexOf(item.group))

  expect(groupOrder).toEqual([...groupOrder].sort())
})

test('search candidates expose reasons for disabled actions without hiding results', () => {
  const candidates = buildSearchCandidates({
    skills: [],
    subagents: [],
    mcp: [{ name: 'wiki', status: 'connected' }],
    actionOrder: QUICK_ACTION_IDS,
    favoriteSkills: new Set(),
    recentSkills: [],
    favoriteMcp: new Set(),
    hasSession: false,
    mcpBusy: true,
  })

  expect(candidates.find((item) => item.group === 'MCP')?.disabled).toBe('MCP operation in progress')
  expect(
    candidates.filter((item) => item.group === 'Actions').every((item) => item.disabled === 'Requires an open session'),
  ).toBe(true)
})

test('fuzzy search remains bounded on large source lists', () => {
  const start = performance.now()
  const candidates = buildSearchCandidates({
    skills: Array.from({ length: 1000 }, (_, index) => ({
      name: `skill-${index}`,
      location: `/skills/${index}`,
      content: '',
      description: '',
    })),
    subagents: [],
    mcp: [],
    actionOrder: [],
    favoriteSkills: new Set(),
    recentSkills: [],
    favoriteMcp: new Set(),
    hasSession: true,
    mcpBusy: false,
  })

  expect(searchResults(candidates, 'skill999')[0].title).toBe('skill-999')
  expect(performance.now() - start).toBeLessThan(1000)
})
