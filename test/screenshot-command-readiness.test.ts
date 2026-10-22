import { expect, test } from 'bun:test'

const { createFixtureDispatch } = await import(
  new URL('../screenshots/harness/fixture-commands.mjs', import.meta.url).href
)

test('screenshot commands wait for lazy registration and remain ordered across modal transitions', async () => {
  const calls: string[] = []
  let registered: string[] = []
  let tick = 0
  const fixture = createFixtureDispatch(
    {
      lifecycle: {},
      keymap: {
        getCommands: () => registered.map((name) => ({ name })),
        dispatchCommand: (name: string) => {
          calls.push(name)
          registered = []

          return { ok: true }
        },
      },
    },
    {
      wait: async () => {
        tick++
        registered = [tick < 3 ? 'first' : 'second']
      },
      attempts: 8,
    },
  )

  fixture.dispatch('first')
  fixture.dispatch('second')
  await fixture.idle()
  expect(calls).toEqual(['first', 'second'])
})

test('screenshot ready gate fails on missing commands instead of capturing the preceding dialog', async () => {
  const fixture = createFixtureDispatch(
    { lifecycle: {}, keymap: { getCommands: () => [], dispatchCommand: () => ({ ok: false }) } },
    { wait: async () => {}, attempts: 2 },
  )

  fixture.dispatch('missing')
  await expect(fixture.idle()).rejects.toThrow('Fixture command did not become ready: missing')
})
