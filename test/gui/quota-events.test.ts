import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { subscribeGuiQuotaEvents } from '../../src/app/gui/adapters/quota-events'
import { createSelectedSessionAccess } from '../../src/app/gui/adapters/selected-session'
import { createProviderLimitsController } from '../../src/entities/provider-limit/model'

import type { MountedSession } from '@opencode/plugin/gui'

test.each(['provider-api', 'codex'])(
  'GUI quota observations refresh only the current native target (%s)',
  async (adapterID) => {
    type Event = { location: { directory: string }; data: { providerID: string; modelID: string } }
    const listeners = new Set<(event: Event) => void>()
    let reads = 0
    const session = {
      id: 'session',
      directory: '/synthetic',
      location: { directory: '/synthetic' },
      visit: {},
      server: {
        id: 'remote',
        connected: true,
        compatible: true,
        data: {},
        client: {
          rpc: () => ({
            events: {
              on: (_type: string, listener: (event: Event) => void) => {
                listeners.add(listener)

                return () => listeners.delete(listener)
              },
            },
          }),
        },
      },
    }
    const access = createSelectedSessionAccess(() => session as unknown as MountedSession)
    const model = { providerID: 'synthetic', modelID: 'selected', sessionID: 'session' }
    const controller = createProviderLimitsController(
      [
        {
          id: adapterID,
          name: 'Synthetic',
          supports: () => true,
          read: async () => {
            reads++

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
      () => model,
    )
    const dispose = createRoot((cleanup) => {
      subscribeGuiQuotaEvents(access, access.capture()!, controller, new AbortController().signal)

      return cleanup
    })
    const emit = (directory: string, modelID = 'selected') => {
      for (const listener of listeners)
        listener({ location: { directory }, data: { providerID: 'synthetic', modelID } })
    }

    try {
      await controller.refresh()
      emit('/other')
      emit('/synthetic', 'other-model')
      expect(reads).toBe(1)
      emit('/synthetic')
      expect(reads).toBe(adapterID === 'provider-api' ? 2 : 1)
      session.visit = {}
      emit('/synthetic')
      expect(reads).toBe(adapterID === 'provider-api' ? 2 : 1)
    } finally {
      dispose()
      controller.dispose()
    }
    expect(listeners.size).toBe(0)
  },
)
