import { expect, test } from 'bun:test'

import { headlessViolations } from '../scripts/headless-boundaries'

test('headless public entries have no transitive host, renderer or platform dependencies', () => {
  const result = headlessViolations()

  expect(result.visited.length).toBeGreaterThan(15)
  expect(result.violations).toEqual([])
})

test.each([
  'import type { Plugin } from "@opencode/plugin/tui"',
  'export { BoxRenderable } from "@opentui/core"',
  'const load = () => import("node:fs/promises")',
  'const load = () => import("fs")',
  'export * from "../mcp/model"',
  'const open = () => document.body',
  'const storage = () => Bun.file("private")',
])('headless boundary rejects a platform dependency even in type/dynamic imports: %s', (source) => {
  const result = headlessViolations(['src/entities/skill/model.ts'], { 'src/entities/skill/model.ts': source })

  expect(result.violations.length).toBeGreaterThan(0)
})
