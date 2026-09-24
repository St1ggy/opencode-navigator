import { expect, test } from 'bun:test'

import { buildMcpGroupedView } from '../src/entities/mcp'

test('MCP grouping keeps favorites first and sorts named groups and servers', () => {
  const items = [
    { name: 'zebra', status: 'connected' as const },
    { name: 'alpha', status: 'disabled' as const },
    { name: 'wiki', status: 'connected' as const },
    { name: 'orphan', status: 'disabled' as const },
  ]
  const grouped = buildMcpGroupedView(items, new Set(['wiki']), { zebra: 'Review', alpha: 'Docs', wiki: 'Docs' })

  expect(grouped.map((item) => [item.bucket, item.name])).toEqual([
    ['Favorites', 'wiki'],
    ['Docs', 'alpha'],
    ['Review', 'zebra'],
    ['Ungrouped', 'orphan'],
  ])
  expect(grouped.find((item) => item.name === 'wiki')?.assignedGroup).toBe('Docs')
})
