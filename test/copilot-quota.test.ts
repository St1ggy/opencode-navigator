import { expect, test } from 'bun:test'

import { createCopilotQuotaReader } from '../src/features/provider-limits/server/copilot-quotas'

import type { NativeQuotaRequest } from '../src/features/provider-limits/server/native-context'
import type * as CopilotSDK from '@github/copilot-sdk'

function harness() {
  const instances: FakeClient[] = []
  const tokens: string[] = []
  let hangStart = false
  let finishStart: (() => void) | undefined
  let hangRead = false
  let billing: { multiplier?: number; tokenPrices?: object } = { multiplier: 1 }
  let premium: object | undefined = { remainingPercentage: 75 }

  class FakeClient {
    stopped = false
    stopCount = 0

    rpc = {
      models: { list: async () => ({ models: [{ id: 'native-model', billing }] }) },
      account: {
        getQuota: async ({ gitHubToken }: { gitHubToken: string }) => {
          tokens.push(gitHubToken)

          if (hangRead) await new Promise(() => {})

          return { quotaSnapshots: { premium_interactions: premium } }
        },
      },
    }

    constructor(readonly options: Record<string, unknown>) {
      instances.push(this)
    }

    async start() {
      if (hangStart)
        await new Promise<void>((resolve) => {
          finishStart = resolve
        })
    }

    async forceStop() {
      this.stopped = true
      this.stopCount++
    }
  }

  const load = async () => ({ CopilotClient: FakeClient }) as unknown as typeof CopilotSDK
  const reader = createCopilotQuotaReader(load, 100)
  const input = (signal = new AbortController().signal) =>
    ({
      model: { providerID: 'github-copilot', modelID: 'selected-model', sessionID: 'session' },
      apiModelID: 'native-model',
      provider: { name: 'Synthetic Copilot' },
      token: 'synthetic-token',
      signal,
    }) as NativeQuotaRequest

  return {
    reader,
    input,
    instances,
    tokens,
    finishStart() {
      finishStart?.()
    },
    startHangs(value: boolean) {
      hangStart = value
    },
    readHangs(value: boolean) {
      hangRead = value
    },
    quota(value: object | undefined) {
      premium = value
    },
    billing(value: typeof billing) {
      billing = value
    },
  }
}

test('Copilot uses explicit host tokens and only model-associated premium allowances', async () => {
  const h = harness()

  try {
    expect((await h.reader.read(h.input())).windows[0]).toMatchObject({ used: 25, remaining: 75, unit: '%' })
    expect(h.tokens).toEqual(['synthetic-token'])
    expect(h.instances[0].options).toMatchObject({ mode: 'empty', useLoggedInUser: false, logLevel: 'none' })
    h.billing({ multiplier: 0 })
    expect((await h.reader.read(h.input())).availability).toBe('unsupported')
    h.billing({ multiplier: 1 })
    h.quota(undefined)
    expect((await h.reader.read(h.input())).availability).toBe('unavailable')
    expect(h.instances).toHaveLength(1)
  } finally {
    await h.reader.dispose()
  }
})

test('Copilot startup deadline settles even when SDK startup never rejects, and retry gets a new runtime', async () => {
  const h = harness()

  try {
    h.startHangs(true)
    await expect(h.reader.read(h.input())).rejects.toBeDefined()
    expect(h.instances[0].stopped).toBe(true)
    h.startHangs(false)
    expect((await h.reader.read(h.input())).availability).toBe('ready')
    expect(h.instances).toHaveLength(2)
    h.finishStart()
    while (h.instances[0].stopCount < 2) await Bun.sleep(1)
    expect(h.instances[1].stopped).toBe(false)
  } finally {
    await h.reader.dispose()
  }
})

test('Copilot cancellation settles a hung RPC and does not poison later reads', async () => {
  const h = harness()

  try {
    h.readHangs(true)
    const controller = new AbortController()
    const pending = h.reader.read(h.input(controller.signal))

    while (h.tokens.length === 0) await Bun.sleep(1)

    controller.abort(new Error('Synthetic cancellation'))
    await expect(pending).rejects.toThrow('Synthetic cancellation')
    expect(h.instances[0].stopped).toBe(true)
    h.readHangs(false)
    expect((await h.reader.read(h.input())).availability).toBe('ready')
    expect(h.instances).toHaveLength(2)
  } finally {
    await h.reader.dispose()
  }
})

test('Copilot disposal prevents a late SDK import from starting a process', async () => {
  const h = harness()
  let finish!: (sdk: typeof CopilotSDK) => void
  const reader = createCopilotQuotaReader(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
    100,
  )
  const pending = reader.read(h.input())

  await Bun.sleep(1)
  await reader.dispose()
  await expect(pending).rejects.toBeDefined()
  finish({
    CopilotClient: class {
      constructor() {
        throw new Error('Must not start')
      }
    },
  } as unknown as typeof CopilotSDK)
  await expect(reader.read(h.input())).rejects.toThrow('disposed')
  await h.reader.dispose()
})
