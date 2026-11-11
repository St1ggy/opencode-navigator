import { expect, test } from 'bun:test'

import { clampMiniWindow, defaultMiniWindow } from '../../src/pages/navigator/model'

test('mini-window stays within narrow, resized and zoomed viewports', () => {
  for (const viewport of [
    { width: 1000, height: 700 },
    { width: 240, height: 180 },
    { width: 0, height: 0 },
  ]) {
    const rect = clampMiniWindow({ x: 5000, y: -5000, width: 2000, height: 2000 }, viewport)

    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width)
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height)
  }
  expect(clampMiniWindow({ x: NaN, y: Infinity, width: NaN, height: -1 }, { width: 1000, height: 700 })).toEqual({
    x: 12,
    y: 12,
    width: 340,
    height: 200,
  })
  expect(defaultMiniWindow({ width: 1000, height: 700 })).toEqual({ x: 640, y: 80, width: 340, height: 460 })
})
