import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { createLimitsRefresh } from '../src/app/limits-refresh'
import { selectedV2Model } from '../src/app/opencode-v2/model-adapter'
import { createProviderLimitsController } from '../src/entities/provider-limit'

import type { ProviderAccountSource, SelectedModel } from '../src/entities/provider-limit'
import type { Plugin } from '@opencode/plugin/tui'

function harness(accountSource?: ProviderAccountSource) {
  const [prompt, setPrompt] = createSignal({ providerID: 'provider', modelID: 'first' })
  const [settings, setSettings] = createSignal({ minutes: 5, unrelated: false })
  const read: SelectedModel[] = []
  const timers: { callback: () => void; milliseconds: number; cleared: boolean }[] = []
  const persistedModel = { providerID: 'provider', modelID: 'first' }
  const context = {
    ui: { router: { current: () => ({ type: 'session', sessionID: 'session' }) }, model: { current: prompt } },
    data: { session: { get: () => ({ model: persistedModel }) } },
  } as unknown as Plugin.Context
  const selected = () => selectedV2Model(context)
  const controller = createProviderLimitsController(
    [
      {
        id: 'synthetic',
        name: 'Synthetic',
        supports: () => true,
        async read(model) {
          read.push(model)

          return {
            model,
            providerId: 'synthetic',
            providerName: 'Synthetic',
            fetchedAt: 1,
            availability: 'ready',
            windows: [],
          }
        },
      },
    ],
    () => {
      settings()
      const model = selected()

      return model && accountSource ? accountSource.current(model) : model
    },
  )
  const dispose = createRoot((cleanup) => {
    createLimitsRefresh(
      { controller, selectedModel: selected, accountSource, refreshMinutes: () => settings().minutes },
      (callback, milliseconds) => {
        const timer = { callback, milliseconds, cleared: false }

        timers.push(timer)

        return () => {
          timer.cleared = true
        }
      },
    )

    return () => {
      cleanup()
      controller.dispose()
    }
  })

  return { controller, read, timers, setSettings, setPrompt, persistedModel, dispose }
}

test('quota polling defaults to five minutes, reschedules only for interval changes, and stops on disposal', async () => {
  const h = harness()

  try {
    await Bun.sleep(0)
    expect(h.read).toHaveLength(1)
    expect(h.timers[0].milliseconds).toBe(300_000)
    h.setSettings({ minutes: 5, unrelated: true })
    await Bun.sleep(0)
    expect(h.read).toHaveLength(1)
    expect(h.timers).toHaveLength(1)
    h.setSettings({ minutes: 1, unrelated: true })
    await Bun.sleep(0)
    expect(h.timers[0].cleared).toBe(true)
    expect(h.timers[1].milliseconds).toBe(60_000)
    expect(h.read).toHaveLength(1)
    h.timers[1].callback()
    await Bun.sleep(0)
    expect(h.read).toHaveLength(2)
    h.setSettings({ minutes: 0, unrelated: true })
    await Bun.sleep(0)
    expect(h.timers.at(-1)?.milliseconds).toBe(300_000)
  } finally {
    h.dispose()
  }
  expect(h.timers.every((timer) => timer.cleared)).toBe(true)
})

test('OpenCode 2 prompt-model selection switches quota target immediately without changing the saved session model', async () => {
  const h = harness()

  try {
    await Bun.sleep(0)
    h.setPrompt({ providerID: 'other-provider', modelID: 'second' })
    await Bun.sleep(0)
    expect(h.persistedModel.modelID).toBe('first')
    expect(h.read.map((model) => model.modelID)).toEqual(['first', 'second'])
    expect(h.controller.snapshot()?.model).toMatchObject({ providerID: 'other-provider', modelID: 'second' })
    expect(h.timers).toHaveLength(1)
  } finally {
    h.dispose()
  }
})

test('periodic account checks cannot duplicate a changed target read or restart polling after disposal', async () => {
  const [account, setAccount] = createSignal('one')
  let finish: (() => void) | undefined
  let delayed = false
  const accounts: ProviderAccountSource = {
    current: (model) => ({ ...model, accountID: account() }),
    refresh: () =>
      delayed
        ? new Promise<void>((resolve) => {
            finish = resolve
          })
        : Promise.resolve(),
    validate: async () => true,
    dispose() {},
  }
  const h = harness(accounts)

  await Bun.sleep(0)
  delayed = true
  h.timers[0].callback()
  setAccount('two')
  finish?.()
  await Bun.sleep(0)
  expect(h.read.map((model) => model.accountID)).toEqual(['one', 'two'])
  h.timers[0].callback()
  h.dispose()
  finish?.()
  await Bun.sleep(0)
  expect(h.read).toHaveLength(2)
})
