import { expect, test } from 'bun:test'

import { createPinnedToolbarModel } from '../src/features/pinned-toolbar/model'

import type { ToolbarPin } from '../src/entities/preferences/model'
import type { SkillInfo } from '../src/entities/skill/model'

test('shared toolbar preserves exact skill sources, state icons, labels and unavailable pins', () => {
  const skill: SkillInfo = { name: 'Synthetic skill', location: '/synthetic/source', content: 'Synthetic instructions' }
  const pins: ToolbarPin[] = [
    {
      kind: 'action',
      id: 'session.new',
      icon: 'plus',
      stateIconLists: { active: ['check', 'star'] },
      text: 'New chat',
    },
    { kind: 'skill', name: skill.name, location: skill.location, icon: 'book', icons: [], text: 'Run skill' },
    { kind: 'skill', name: skill.name, location: '/synthetic/other-source', icon: 'book' },
  ]
  const calls: unknown[] = []
  let available = true
  const model = createPinnedToolbarModel({
    pins: () => pins,
    action: () => ({
      label: 'New session',
      state: 'active',
      stateLabel: 'Active',
      reason: available ? undefined : 'Unavailable here',
    }),
    skill: (pin) => (pin.location === skill.location ? { skill } : { reason: 'Exact source unavailable' }),
    runAction: (id) => {
      calls.push(id)
    },
    runSkill: (item) => {
      calls.push(item)
    },
    unavailable: (label, reason) => {
      calls.push([label, reason])
    },
  })

  expect(model.view(pins[0])).toMatchObject({ label: 'New session', icons: ['check', 'star'], text: 'New chat' })
  expect(model.view(pins[1]).icons).toEqual([])
  model.run('skill:/synthetic/source')
  model.run('skill:/synthetic/other-source')
  expect(calls).toEqual([skill, ['Synthetic skill', 'Exact source unavailable']])
  available = false
  model.run('action:session.new')
  expect(calls.at(-1)).toEqual(['New session', 'Unavailable here'])
  expect(model.pins()).toBe(pins)
})
