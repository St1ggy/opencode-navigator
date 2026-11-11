import { createMemo, createSignal } from 'solid-js'

import { SEARCH_GROUPS, searchResults } from './search-engine'

import type { SearchGroup, SearchResult } from './search-engine'

export function createSearchViewState(candidates: () => readonly SearchResult[]) {
  const [query, setQuery] = createSignal('')
  const [group, setGroup] = createSignal<SearchGroup>('Skills')
  const [selection, setSelection] = createSignal<Partial<Record<SearchGroup, string>>>({})
  const results = createMemo(() => searchResults(candidates(), query()))
  const rows = createMemo(() => results().filter((item) => item.group === group()))
  const selected = () => rows().find((item) => item.id === selection()[group()])?.id ?? rows()[0]?.id

  return {
    query,
    setQuery,
    group,
    setGroup,
    results,
    rows,
    selected,
    groups: SEARCH_GROUPS,
    count: (tab: SearchGroup) => results().filter((item) => item.group === tab).length,
    select: (id: string) => setSelection((previous) => ({ ...previous, [group()]: id })),
  }
}

export type SearchViewState = ReturnType<typeof createSearchViewState>
