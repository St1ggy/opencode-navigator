import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { createCatalogViews } from '../../src/pages/navigator/model'

test('catalog views retain full group buckets while filters/limits affect only presentation', () => {
  const root = createRoot((dispose) => {
    const [hideFavorite, setHideFavorite] = createSignal(false)
    const views = createCatalogViews({
      scope: 'server-location',
      skills: {
        list: () => [
          { name: 'First', location: '/synthetic/first', content: 'First' },
          { name: 'Second', location: '/synthetic/second', content: 'Second' },
        ],
      },
      mcp: {
        list: () => [
          { name: 'first-server', status: 'connected' },
          { name: 'second-server', status: 'disabled' },
        ],
      },
      preferences: {
        favoriteSkills: () => new Set(),
        skillGroups: () => ({ '/synthetic/first': 'Build', '/synthetic/second': 'Review' }),
        recentSkills: () => [],
        favoriteMcpServers: () => new Set(),
        mcpServerGroups: () => ({ 'first-server': 'Team', 'second-server': 'Team' }),
        sectionItemLimit: () => 1,
        quickActionOrder: () => ['session.new', 'session.list', 'session.export'],
        favoriteQuickActions: () => new Set(['session.export']),
        quickActionVisible: (id) => !hideFavorite() || id !== 'session.export',
      },
      actionState: (id) => ({ label: id, available: true }),
    })

    return { dispose, views, setHideFavorite }
  })

  try {
    const { skills, mcp, actions } = root.views

    expect(skills.all()).toHaveLength(2)
    expect(skills.visibility.visible()).toHaveLength(1)
    skills.setQuery('Review')
    expect(skills.visibility.visible()[0].location).toBe('/synthetic/second')
    mcp.setQuery('second-server')
    expect(mcp.visibility.visible()).toHaveLength(1)
    expect(mcp.bucket('Team')).toHaveLength(2)
    expect(actions.visibility.visible()).toEqual(['session.export'])
    root.setHideFavorite(true)
    expect(actions.all()).toEqual(['session.new', 'session.list'])
  } finally {
    root.dispose()
  }
})
