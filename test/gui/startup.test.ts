import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { registerGuiStartup } from '../../src/app/gui/startup'

import type { PreferencesController } from '../../src/entities/preferences/model'
import type { Context } from '@opencode/plugin/gui'

const release = { version: '2.0.0', changelog: '## [2.0.0]\n- Synthetic change\n\n## [1.0.0]\n- Older change\n' }

test('GUI startup claims once after hydration/session arrival and never shows upgrade notes on a fresh install', async () => {
  const claims: string[] = []
  let guides = 0
  let notes = 0
  const root = createRoot((dispose) => {
    const [ready, setReady] = createSignal(false)
    const [session, setSession] = createSignal<object>()
    const context = {
      signal: new AbortController().signal,
      sessions: { current: session },
      toast: { show() {} },
      dialogs: {
        active: () => false,
        open: () => {
          notes++
        },
      },
    } as unknown as Context
    const preferences = {
      ready,
      claimFirstRun: async () => true,
      claimNavigatorUpgrade: async (version: string) => {
        claims.push(version)
      },
    } as unknown as PreferencesController

    registerGuiStartup(
      context,
      preferences,
      () => {
        guides++
      },
      release,
    )

    return { dispose, setReady, setSession }
  })

  try {
    root.setReady(true)
    expect(claims).toEqual([])
    root.setSession({})
    await Bun.sleep(0)
    expect(claims).toEqual([release.version])
    expect(guides).toBe(1)
    expect(notes).toBe(0)
    root.setSession({})
    await Bun.sleep(0)
    expect(claims).toHaveLength(1)
  } finally {
    root.dispose()
  }
})

test('GUI startup selects only upgrade notes and skips empty technical versions or disposed windows', async () => {
  for (const mode of ['upgrade', 'technical', 'disposed'] as const) {
    let notes = 0
    let guides = 0
    const root = createRoot((dispose) => {
      const context = {
        signal: new AbortController().signal,
        sessions: { current: () => ({}) },
        toast: { show() {} },
        dialogs: {
          active: () => false,
          open: () => {
            notes++
          },
        },
      } as unknown as Context
      const preferences = {
        ready: () => true,
        claimFirstRun: async () => false,
        claimNavigatorUpgrade: async () => '1.0.0',
      } as unknown as PreferencesController

      registerGuiStartup(
        context,
        preferences,
        () => {
          guides++
        },
        mode === 'technical' ? { ...release, changelog: '## [2.0.0]\n' } : release,
      )

      return { dispose }
    })

    if (mode === 'disposed') root.dispose()

    await Bun.sleep(0)
    expect(guides).toBe(0)
    expect(notes).toBe(mode === 'upgrade' ? 1 : 0)
    root.dispose()
  }
})
