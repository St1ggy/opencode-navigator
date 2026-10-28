import { expect, test } from 'bun:test'

import { createProviderLimitsController } from '../src/entities/provider-limit'
import { createOpenCodeUsageAdapter } from '../src/features/provider-limits'

import type { SelectedModel } from '../src/entities/provider-limit'
import type { Plugin } from '@opencode/plugin/tui'

test.each(['budgets', 'go', 'auth', 'failure'])('native usage capture: %s without live reads', async (scene) => {
  const { createHostUsageFixture } = (await import(
    new URL('../screenshots/harness/host-usage.mjs', import.meta.url).href
  )) as {
    createHostUsageFixture: (
      scene: string,
      now: number,
      directory: string,
    ) => { context: Plugin.Context; model: SelectedModel }
  }

  const fixture = createHostUsageFixture(`host-usage-${scene}`, 1_893_456_000_000, '/synthetic/workspace')
  const source = createOpenCodeUsageAdapter(fixture.context)
  const controller = createProviderLimitsController([source.adapter], () => source.target(fixture.model))

  try {
    await controller.refresh()
    const snapshot = controller.snapshot()

    switch (scene) {
      case 'budgets': {
        expect(snapshot?.workspaceId).toBe('synthetic-workspace')
        expect(snapshot?.windows[1].resetsAt).toBe((1_893_456_000_000 + 3_600_000) / 1000)
        expect(snapshot?.windows.map((window) => [window.unit, window.remaining])).toEqual([
          ['USD', 65],
          ['USD', 15],
        ])
        break
      }

      case 'go': {
        expect(snapshot?.windows[0].resetsAt).toBe((1_893_456_000_000 + 3_600_000) / 1000)
        expect(snapshot?.windows.map((window) => [window.unit, window.remaining])).toEqual([
          ['%', 75],
          ['%', 20],
          ['%', 0],
        ])
        expect(snapshot?.windows[2].limited).toBe(true)
        break
      }

      case 'auth': {
        expect(snapshot?.availability).toBe('unauthenticated')
        break
      }

      case 'failure': {
        expect(controller.state().status).toBe('error')
        expect(controller.state().error?.message).toContain('Refresh to retry the native source')
      }
    }
  } finally {
    controller.dispose()
  }
})
