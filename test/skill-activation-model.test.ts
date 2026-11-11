import { expect, test } from 'bun:test'

import { createSkillActivation, createSkillModel } from '../src/entities/skill/model'

import type { SkillInfo } from '../src/entities/skill/model'

test('shared skill activation preserves exact source, trust and stale-target guards', async () => {
  const skill: SkillInfo = {
    id: 'source-id',
    name: 'Synthetic',
    location: '/synthetic/source',
    content: 'Synthetic instructions',
  }
  let items = [skill]
  let current = true
  const calls: string[] = []
  const controller = createSkillModel({
    lifecycle: { signal: new AbortController().signal, onDispose: () => {} },
    target: () => ({ key: 'server-location', scope: 'global', routing: { directory: '/synthetic' } }),
    source: {
      list: () => items,
      refresh: async () => items,
      use: async (_target, item) => {
        calls.push(item.id!)

        return true
      },
    },
    cache: 'source',
    onReconnect: () => () => {},
  })
  const access = {
    shouldConfirmSkill: () => true,
    skipSkillConfirmation: () => {
      calls.push('trust')
    },
    recordSkillUse: async () => {
      calls.push('recent')
    },
  }
  const activation = createSkillActivation({ controller, access, skill, current: () => current })

  expect(activation.shouldConfirm()).toBe(true)
  expect(await activation.run(true)).toBe(true)
  expect(calls).toEqual(['trust', 'source-id', 'recent'])
  items = [{ ...skill, id: 'replacement-source-id' }]
  await Promise.resolve(expect(activation.run()).rejects.toThrow('source changed'))
  items = [skill]
  current = false
  await Promise.resolve(expect(activation.run(true)).rejects.toThrow('target changed'))
  expect(calls).toHaveLength(3)
})
