import { expect, test } from 'bun:test'

import {
  createPreferencesModel,
  emptyPreferencesDocument,
  toolbarPinAppearance,
  toolbarPinAppearanceChange,
} from '../src/entities/preferences/model'
import { pluginConfig } from '../src/shared/config'

import type { ToolbarPin } from '../src/entities/preferences/model'

test('shared toolbar appearance preserves legacy state icons and builds a guarded configure update without mutating its source', () => {
  const pin: ToolbarPin = {
    kind: 'action',
    id: 'session.new',
    icon: 'bolt',
    stateIcons: { enabled: 'check' },
    stateIconLists: { disabled: ['lock', 'shield'] },
  }
  const expected = JSON.stringify(pin)
  const draft = toolbarPinAppearance(pin)
  const change = toolbarPinAppearanceChange(
    pin,
    { ...draft, base: ['plus', 'star'], text: ' Launch ', states: { ...draft.states, enabled: ['play'] } },
    expected,
  )

  expect(change).toMatchObject({
    operation: 'configure',
    key: 'action:session.new',
    icon: 'plus',
    icons: ['plus', 'star'],
    text: 'Launch',
    expected,
    stateIcons: { enabled: 'play', disabled: null },
    stateIconLists: { enabled: null, disabled: ['lock', 'shield'] },
  })
  expect(JSON.stringify(pin)).toBe(expected)
  expect(toolbarPinAppearanceChange(pin, { base: [], text: 'Text only', states: {} })).toMatchObject({
    operation: 'pin',
    pin: { icons: [], text: 'Text only' },
  })
  expect(() => toolbarPinAppearanceChange(pin, { base: [], text: '', states: {} })).toThrow('Add an icon or text')
  expect(() => toolbarPinAppearanceChange(pin, { base: ['bolt'], text: 'invalid\n', states: {} })).toThrow(
    'single line',
  )
  expect(() =>
    toolbarPinAppearanceChange(pin, {
      base: ['bolt'],
      text: '',
      states: { enabled: ['plus', 'bolt', 'star', 'play'] },
    }),
  ).toThrow('zero to three')
})

test('awaitable toolbar saves report authoritative persistence failures without changing the legacy command API', async () => {
  const messages: string[] = []
  const model = createPreferencesModel(
    {
      notifications: {
        show: (message) => {
          messages.push(message.message)
        },
      },
      validKey: () => true,
    },
    pluginConfig({}),
    {
      load: async () => emptyPreferencesDocument(),
      update: async () => {
        throw new Error('Synthetic private store failure')
      },
      flush: async () => {},
    },
  )

  await model.load()
  await Promise.resolve(
    expect(
      model.saveToolbarPin({ operation: 'pin', pin: { kind: 'action', id: 'session.new', icon: 'bolt' } }),
    ).rejects.toThrow('Synthetic private store failure'),
  )
  expect(messages).toEqual(['Synthetic private store failure'])
})
