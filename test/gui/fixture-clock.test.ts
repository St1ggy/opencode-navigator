import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

function fixtureClock() {
  const clock = { now: () => 1234, parse: Date.parse }
  const module: {
    exports: { default?: { main(context: { options: { captureClock: boolean }; signal: AbortSignal }): void } }
  } = { exports: {} }

  runInNewContext(readFileSync('test/gui/harness/fixture.cjs', 'utf8'), {
    module,
    Date: clock,
    require(name: string) {
      if (name !== '@opencode/plugin/gui') throw new Error(`Unexpected synthetic fixture import: ${name}`)

      return { Plugin: { define: (value: unknown) => value } }
    },
  })

  return { clock, main: module.exports.default!.main }
}

test('normal Desktop fixture leaves main time untouched; capture mode freezes only wall-clock reads and restores on abort', () => {
  const { clock, main } = fixtureClock()
  const original = clock.now
  const controller = new AbortController()

  main({ options: { captureClock: false }, signal: controller.signal })
  expect(clock.now).toBe(original)
  main({ options: { captureClock: true }, signal: controller.signal })
  expect(clock.now()).toBe(Date.parse('2026-11-01T12:00:00Z'))
  controller.abort()
  expect(clock.now).toBe(original)
  expect(clock.now()).toBe(1234)
})
