import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { reorderItems } from '../../src/shared/lib/reorder'
import { createSortableInteraction } from '../../src/shared/ui/gui/sortable-interaction'

function fixture() {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const captures = new Set<number>()
  let target = 'b'
  const node = {
    dataset: {
      get sortableItem() {
        return target
      },
    },
    closest() {
      return node
    },
  }
  const root = {
    contains: (value: unknown) => value === node,
    setPointerCapture: (id: number) => captures.add(id),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => captures.delete(id),
  } as unknown as HTMLElement

  Object.defineProperties(globalThis, {
    window: { configurable: true, value: new EventTarget() },
    document: { configurable: true, value: { elementFromPoint: () => node } },
  })
  const moves: string[][] = []
  const model = createRoot((dispose) => {
    const [keys, setKeys] = createSignal(['a', 'b', 'c'])
    const [scope, setScope] = createSignal('global')
    const interaction = createSortableInteraction({
      keys,
      scope,
      disabled: () => false,
      root: () => root,
      move(from, to) {
        moves.push([from, to])
        setKeys((items) => reorderItems(items, from, to, (id) => id))
      },
    })

    return { interaction, keys, setScope, dispose }
  })

  return {
    ...model,
    moves,
    captures,
    target: (value: string) => {
      target = value
    },
    dispose() {
      model.dispose()

      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
      else Reflect.deleteProperty(globalThis, 'window')

      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
      else Reflect.deleteProperty(globalThis, 'document')
    },
  }
}

const pointer = () =>
  ({ button: 0, pointerId: 1, clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {} }) as PointerEvent
const key = (value: string) =>
  ({ key: value, repeat: false, preventDefault() {}, stopPropagation() {} }) as KeyboardEvent

test('pointer ordering commits on drop, releases capture and rejects changed scopes', () => {
  const f = fixture()

  try {
    f.interaction.start(pointer(), 'a')
    expect(f.moves).toEqual([])
    f.interaction.end(pointer())
    expect(f.keys()).toEqual(['b', 'a', 'c'])
    expect(f.captures.size).toBe(0)
    f.interaction.start(pointer(), 'a')
    f.setScope('another-worktree')
    f.interaction.end(pointer())
    expect(f.moves).toHaveLength(1)
  } finally {
    f.dispose()
  }
})

test('keyboard pickup/drop preserves the order on Escape and commits only on explicit drop', () => {
  const f = fixture()

  try {
    f.interaction.key(key(' '), 'a')
    f.interaction.key(key('ArrowDown'), 'a')
    expect(f.moves).toEqual([])
    f.interaction.key(key('Escape'), 'a')
    expect(f.keys()).toEqual(['a', 'b', 'c'])
    f.interaction.key(key(' '), 'a')
    f.interaction.key(key('ArrowDown'), 'a')
    f.interaction.key(key(' '), 'a')
    expect(f.keys()).toEqual(['b', 'a', 'c'])
  } finally {
    f.dispose()
  }
})
