import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { createSearchViewState } from '../../src/features/search-everything/model'

import type { SearchResult } from '../../src/features/search-everything/model'

test('Search shares a query while retaining per-tab selections through reactive catalog updates', () => {
  const root = createRoot((dispose) => {
    const [items, setItems] = createSignal<SearchResult[]>([
      { id: 'first', title: 'Common first', description: '', group: 'Actions', command: 'session.new' },
      { id: 'second', title: 'Common second', description: '', group: 'Actions', command: 'session.list' },
      { id: 'child', title: 'Common child', description: '', group: 'Subagents', sessionID: 'child' },
    ])

    return { dispose, setItems, model: createSearchViewState(items) }
  })

  try {
    const model = root.model

    model.setQuery('Common')
    model.setGroup('Actions')
    model.select('second')
    model.setGroup('Subagents')
    model.select('child')
    model.setGroup('Actions')
    expect(model.selected()).toBe('second')
    expect(model.query()).toBe('Common')
    root.setItems((items) => items.toReversed())
    expect(model.selected()).toBe('second')
    expect(model.count('Actions')).toBe(2)
    expect(model.count('Subagents')).toBe(1)
    model.setGroup('Subagents')
    expect(model.selected()).toBe('child')
  } finally {
    root.dispose()
  }
})
