import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { createProviderLimitsController } from '../src/entities/provider-limit'

import type { ProviderQuotaAdapter, SelectedModel } from '../src/entities/provider-limit'

const selected: SelectedModel = {
  sessionID: 'one',
  providerID: 'openai',
  modelID: 'gpt-5-codex',
  accountID: 'account-1',
}

test('provider limits discard old reads after switching models, providers, or sessions', async () => {
  const [model, setModel] = createSignal<SelectedModel | undefined>(selected)
  let finish!: (value: Awaited<ReturnType<ProviderQuotaAdapter['read']>>) => void
  const adapter: ProviderQuotaAdapter = {
    id: 'codex',
    name: 'Codex CLI',
    supports: (candidate) => candidate.providerID === 'openai' && Boolean(candidate.accountID),
    read: () => new Promise((resolve) => (finish = resolve)),
  }
  const controller = createProviderLimitsController([adapter], model)
  const pending = controller.refresh()

  setModel({ ...selected, providerID: 'anthropic', modelID: 'claude-sonnet' })
  expect(controller.snapshot()).toBeUndefined()
  finish({
    model: selected,
    providerId: 'codex',
    providerName: 'Codex CLI',
    availability: 'ready',
    fetchedAt: 1_800_000_000,
    windows: [],
  })
  await pending
  setModel(selected)
  expect(controller.snapshot()).toBeUndefined()
  controller.dispose()
})

test('provider limits classify throttling and keep unsupported models calm', async () => {
  const model = () => selected
  const controller = createProviderLimitsController(
    [
      {
        id: 'codex',
        name: 'Codex CLI',
        supports: () => true,
        read: async () => {
          throw Object.assign(new Error('Too many requests'), { status: 429 })
        },
      },
    ],
    model,
  )

  await controller.refresh()
  expect(controller.snapshot()?.availability).toBe('rate_limited')
  expect(controller.state().status).toBe('ready')
  controller.dispose()
})
