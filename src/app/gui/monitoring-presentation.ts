import { createEffect } from 'solid-js'

import { defaultMiniWindow } from '../../pages/navigator/model'

import { guiPreferenceSession } from './adapters/settings-session'

import type { MiniWindowRect } from '../../pages/navigator/model'
import type { MonitoringRegistry } from './monitoring-registry'
import type { Context } from '@opencode/plugin/gui'

export function createMonitoringPresentation(context: Context, registry: MonitoringRegistry) {
  const panelKey = `${context.id}:navigator`
  const [state, change] = context.storage.memory<{
    floating: boolean
    rect: MiniWindowRect
    scroll: Record<string, number>
  }>(`${context.id}.presentation`, {
    initial: {
      floating: false,
      rect: defaultMiniWindow({ width: window.innerWidth, height: window.innerHeight }),
      scroll: {},
    },
  })

  function open() {
    const session = guiPreferenceSession(context)

    if (session) context.layout.open(panelKey, session)
  }
  function dock() {
    if (!guiPreferenceSession(context)) return

    open()
    change((value) => {
      value.floating = false
    })
  }
  function float() {
    if (!guiPreferenceSession(context)) return

    if (context.layout.narrow()) {
      dock()

      return
    }

    change((value) => {
      value.floating = true
    })
  }
  createEffect(() => {
    if (state.floating && context.layout.narrow()) dock()
  })

  return {
    state,
    open,
    dock,
    float,
    reset: () =>
      change((value) => {
        value.rect = defaultMiniWindow({ width: window.innerWidth, height: window.innerHeight })
      }),
    title: () => {
      const session = context.sessions.current()

      return session?.server.data.session.get(session.id)?.title ?? 'Untitled session'
    },
    setRect: (rect: MiniWindowRect) =>
      change((value) => {
        value.rect = rect
      }),
    scrollTop: () => state.scroll[registry.active()?.target.sessionKey ?? ''] ?? 0,
    scroll(top: number) {
      const key = registry.active()?.target.sessionKey

      if (key)
        change((value) => {
          value.scroll[key] = top
        })
    },
  }
}
