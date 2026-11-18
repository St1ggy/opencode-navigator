import { expect, test } from 'bun:test'

import { createGuiSectionLayouts } from '../../src/app/gui/section-layouts'

import type { Context } from '@opencode/plugin/gui'

function host() {
  let state: object | undefined
  let opened = ''
  const context = {
    id: 'synthetic.navigator',
    storage: {
      memory(key: string, options: { initial: object }) {
        opened = key
        state ??= options.initial

        return [state, (mutate: (value: object) => void) => mutate(state!)]
      },
    },
  } as unknown as Context

  return { context, key: () => opened }
}

test('numeric section geometry survives a plugin reload in host window memory without sharing targets', () => {
  const fixture = host()
  const cache = createGuiSectionLayouts(fixture.context)
  const layout = { width: 260, height: 100, rects: [{ x: 0, y: 0, width: 32, height: 16 }] }

  cache.write('server-a:session:todo', layout)
  layout.rects[0].width = 99
  const reloaded = createGuiSectionLayouts(fixture.context)

  expect(fixture.key()).toBe('synthetic.navigator.startup-layout-v1')
  expect(reloaded.read('server-a:session:todo')?.rects[0].width).toBe(32)
  expect(reloaded.read('server-b:session:todo')).toBeUndefined()
})

test('section geometry memory stays bounded and updating an existing target does not evict another', () => {
  const fixture = host()
  const cache = createGuiSectionLayouts(fixture.context)
  const layout = { width: 260, height: 100, rects: [] }

  for (let index = 0; index < 64; index++) cache.write(`target-${index}`, layout)
  cache.write('target-63', { ...layout, height: 101 })
  expect(cache.read('target-0')).toBeDefined()
  cache.write('target-64', layout)
  expect(cache.read('target-0')).toBeUndefined()
  expect(cache.read('target-1')).toBeDefined()
  expect(cache.read('target-63')?.height).toBe(101)
})
