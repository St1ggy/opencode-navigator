import { expect, test } from 'bun:test'

import { buildSkillGroupedView } from '../src/entities/skill'

test('Skill groups keep Favorites first, named groups alphabetical and recent Ungrouped skills visible', () => {
  const items = [
    { name: 'zebra', location: '/a/zebra/SKILL.md', content: '' },
    { name: 'favorite', location: '/a/favorite/SKILL.md', content: '' },
    { name: 'alpha', location: '/a/alpha/SKILL.md', content: '' },
    { name: 'recent', location: '/a/recent/SKILL.md', content: '' },
    { name: 'other', location: '/a/other/SKILL.md', content: '' },
  ]
  const groups = { '/a/zebra/SKILL.md': 'Review', '/a/alpha/SKILL.md': 'Docs' }
  const result = buildSkillGroupedView(
    items,
    new Set(['/a/favorite/SKILL.md']),
    groups,
    new Map([['/a/recent/SKILL.md', 0]]),
  )

  expect(result.map((item) => [item.bucket, item.name])).toEqual([
    ['Favorites', 'favorite'],
    ['Docs', 'alpha'],
    ['Review', 'zebra'],
    ['Ungrouped', 'recent'],
    ['Ungrouped', 'other'],
  ])
})

test('Skill groups distinguish equal names from different source locations', () => {
  const items = [
    { name: 'review', location: '/one/review/SKILL.md', content: '' },
    { name: 'review', location: '/two/review/SKILL.md', content: '' },
  ]

  expect(
    buildSkillGroupedView(items, new Set(), { '/two/review/SKILL.md': 'Work' }, new Map()).map((item) => item.bucket),
  ).toEqual(['Work', 'Ungrouped'])
})
