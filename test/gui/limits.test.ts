import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { createGuiLimits } from '../../src/app/gui/adapters/limits'
import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'

import type { ComposerModel, Context, MountedSession } from '@opencode/plugin/gui'

test('GUI Limits follows reactive composer choices before any message is sent', async () => {
  const reads: string[] = []
  const root = createRoot((dispose) => {
    const [model, setModel] = createSignal<ComposerModel>({ providerID: 'synthetic', modelID: 'before-send-a' })
    const session = {
      id: 'session',
      directory: '/synthetic/project',
      location: { directory: '/synthetic/project' },
      visit: {},
      server: {
        id: 'remote',
        connected: true,
        compatible: true,
        data: {},
        client: {
          rpc: () => ({
            events: { on: () => () => {} },
            read: async (input: { modelID: string }) => {
              reads.push(input.modelID)

              return {
                providerId: 'synthetic',
                providerName: 'Synthetic',
                fetchedAt: 100,
                availability: 'ready',
                windows: [],
              }
            },
          }),
        },
      },
    }
    const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
    const limits = createGuiLimits(
      {
        sessions: { current: () => session },
        screen: { current: () => ({ composer: { model } }) },
      } as unknown as Context,
      access,
      access.capture()!,
      new AbortController().signal,
    )

    return { limits, setModel, dispose }
  })

  try {
    await root.limits.controller.refresh()
    expect(reads).toEqual(['before-send-a'])
    root.setModel({ providerID: 'synthetic', modelID: 'before-send-b', variant: 'high' })
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(reads).toEqual(['before-send-a', 'before-send-b'])
    expect(root.limits.controller.snapshot()?.model.modelID).toBe('before-send-b')
    expect(root.limits.controller.snapshot()?.model.variant).toBe('high')
  } finally {
    root.dispose()
  }
})

test('GUI monitoring reads account quotas only through the selected server and keeps model controls native', async () => {
  const calls: unknown[] = []
  const commands: string[] = []
  let pause: Promise<void> | undefined
  let remaining = 70
  const session = {
    id: 'session',
    directory: '/synthetic/project',
    location: { directory: '/synthetic/project' },
    visit: {},
    pending: false,
    server: {
      id: 'remote',
      connected: true,
      compatible: true,
      data: {},
      client: {
        rpc: () => ({
          events: { on: () => () => {} },
          read: async (input: unknown, options: unknown) => {
            calls.push([input, options])
            await pause

            return {
              providerId: 'synthetic',
              providerName: 'Synthetic provider',
              fetchedAt: 100,
              availability: 'ready',
              accountId: 'synthetic-account',
              windows: [{ id: 'ordinary', label: 'Ordinary quota', scope: 'account', unit: '%', remaining }],
            }
          },
        }),
      },
    },
  }
  const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
  const scope = access.capture()!
  const limits = createGuiLimits(
    {
      sessions: { current: () => session },
      screen: {
        current: () => ({
          composer: { model: () => ({ providerID: 'synthetic', modelID: 'model-a', variant: 'high' }) },
        }),
      },
      commands: {
        run: (id: string) => {
          commands.push(id)

          return true
        },
      },
    } as unknown as Context,
    access,
    scope,
    new AbortController().signal,
  )

  try {
    await limits.controller.refresh()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject([
      { providerID: 'synthetic', modelID: 'model-a', sessionID: 'session', variant: 'high' },
      { location: { directory: '/synthetic/project' } },
    ])
    expect(limits.controller.snapshot()?.windows[0].scope).toBe('account')
    expect(JSON.parse(limits.controller.snapshot()!.model.quotaContext!)[0]).toBe(scope.target.sessionKey)
    limits.chooseModel()
    limits.chooseVariant()
    expect(commands).toEqual(['model.choose', 'model.variant.cycle'])
    let resume!: () => void

    remaining = 10
    pause = new Promise((resolve) => {
      resume = resolve
    })
    const late = limits.controller.refresh(true)

    session.server.data = {}
    resume()
    await late
    expect(limits.controller.snapshot()?.windows[0].remaining).toBe(70)
    session.visit = {}
    await limits.controller.refresh(true)
    expect(calls).toHaveLength(2)
    limits.chooseModel()
    expect(commands).toHaveLength(2)
  } finally {
    limits.controller.dispose()
  }
})
