import { expect, test } from 'bun:test'

import { changeToolbarPins, parseToolbarPins, toolbarPinIcons } from '../src/entities/preferences'
import { toolbarLayout } from '../src/pages/session-sidebar/model/toolbar-layout'

test('pins retain legacy single icons and support bounded groups, text-only labels and state choices', () => {
  const legacy = { kind: 'action' as const, id: 'session.new' as const, icon: 'plus' }
  const pin = { ...legacy, icons: [], text: 'Start', stateIconLists: { idle: ['play', 'rocket'], unknown: [] } }

  expect(parseToolbarPins([legacy])).toEqual([legacy])
  expect(parseToolbarPins([pin])).toEqual([pin])
  expect(toolbarPinIcons(pin)).toEqual([])
  expect(toolbarPinIcons(pin, 'idle')).toEqual(['play', 'rocket'])
  expect(parseToolbarPins([{ ...legacy, icons: ['plus', 'play', 'rocket', 'star'] }])).toEqual([])
  expect(parseToolbarPins([{ ...legacy, icons: [] }])).toEqual([])
  expect(parseToolbarPins([{ ...legacy, text: 'Two\nlines' }])).toEqual([])
  const changed = changeToolbarPins([pin], {
    operation: 'configure',
    key: 'action:session.new',
    icon: 'check',
    icons: null,
    text: null,
    stateIconLists: { idle: null, unknown: null },
    expected: JSON.stringify(pin),
  })

  expect(changed).toEqual([{ ...legacy, icon: 'check' }])
  expect(() =>
    changeToolbarPins(changed, {
      operation: 'configure',
      key: 'action:session.new',
      icon: 'play',
      expected: JSON.stringify(pin),
    }),
  ).toThrow('Pin changed')
})

test('variable-width layout measures actual controls, reserves More and clips a long single button', () => {
  const widths = new Map([
    ['a', 8],
    ['b', 5],
    ['c', 3],
  ])

  expect(toolbarLayout(['a', 'b', 'c'], 12, 'menu', widths)).toMatchObject({
    rows: [['a', 'toolbar:more']],
    overflow: ['b', 'c'],
    sizes: { a: 8, 'toolbar:more': 3 },
  })
  expect(toolbarLayout(['a', 'b', 'c'], 12, 'wrap', widths).rows).toEqual([['a'], ['b', 'c']])
  expect(toolbarLayout(['long'], 9, 'menu', new Map([['long', 100]])).sizes?.long).toBe(9)
  expect(toolbarLayout(['long', 'next'], 9, 'menu', new Map([['long', 100]])).sizes?.long).toBe(5)
})
