import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { createMeasuredToolbar } from '../../src/features/pinned-toolbar/ui/gui/measured-layout'

test('toolbar measurement retains hidden-view geometry and releases its observers', async () => {
  const original = globalThis.ResizeObserver
  const observed = new Set<Element>()
  let resized = () => {}
  let disconnected = false

  class Observer {
    constructor(callback: () => void) {
      resized = callback
    }

    observe(node: Element) {
      observed.add(node)
    }

    unobserve(node: Element) {
      observed.delete(node)
    }

    disconnect() {
      observed.clear()
      disconnected = true
    }
  }
  globalThis.ResizeObserver = Observer as unknown as typeof ResizeObserver
  let size = 208
  const rootNode = {
    get clientWidth() {
      return size
    },
  } as HTMLElement
  const button = { getBoundingClientRect: () => ({ width: 84 }) } as HTMLElement
  const more = { getBoundingClientRect: () => ({ width: 28 }) } as HTMLElement
  const root = createRoot((dispose) => {
    const layout = createMeasuredToolbar()

    layout.root(rootNode)
    layout.button('synthetic', button)
    layout.more(more)

    return { layout, dispose }
  })

  try {
    await Promise.resolve()
    expect(root.layout.width()).toBe(200)
    expect(root.layout.widths()).toEqual({ synthetic: 84 })
    expect(root.layout.moreWidth()).toBe(28)
    expect(observed.size).toBe(3)
    size = 0
    resized()
    expect(root.layout.width()).toBe(200)
    size = 108
    resized()
    expect(root.layout.width()).toBe(100)
    root.layout.button('synthetic', undefined)
    await Promise.resolve()
    expect(root.layout.widths()).toEqual({})
  } finally {
    root.dispose()
    globalThis.ResizeObserver = original
  }
  expect(disconnected).toBe(true)
  expect(observed.size).toBe(0)
})
