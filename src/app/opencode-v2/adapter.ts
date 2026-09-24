import { homedir } from 'node:os'
import { join } from 'node:path'

import { setHostCapabilities } from '../../shared/lib/host-capabilities'

import { createV2ClientAdapter } from './client-adapter'
import { createV2EventAdapter } from './event-adapter'
import { createV2Keymap } from './keymap-adapter'
import { createV2SessionAdapter } from './session-adapter'
import { createV2Slots } from './slots-adapter'
import { legacyTheme } from './theme-adapter'
import { createV2UI } from './ui-adapter'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function stateDirectory() {
  const base =
    process.env.XDG_STATE_HOME ??
    (process.platform === 'win32' ? process.env.LOCALAPPDATA : undefined) ??
    join(homedir(), '.local', 'state')

  return join(base, 'opencode')
}

function route(context: Plugin.Context) {
  const current = context.ui.router.current()

  if (current.type === 'session') return { name: 'session' as const, params: { sessionID: current.sessionID } }

  if (current.type === 'plugin') return { name: current.name, params: current.data }

  return { name: 'home' as const }
}

function noop() {
  // The legacy route API requires a disposer even though v2 pages are not adapted.
}

function emptyUnregister() {
  return noop
}

export function createOpenCodeV2Api(context: Plugin.Context) {
  const controller = new AbortController()
  const disposers: (() => void | Promise<void>)[] = []
  const currentLocation = context.location ?? context.data.location.default()
  const keymap = createV2Keymap(context)
  const sessions = createV2SessionAdapter(context)
  const remote = createV2ClientAdapter(context)
  const ui = createV2UI(context)
  const onDispose = (dispose: () => void | Promise<void>) => {
    disposers.push(dispose)

    return () => {
      const index = disposers.indexOf(dispose)

      if (index !== -1) disposers.splice(index, 1)
    }
  }
  const api = {
    app: { version: context.app.version },
    renderer: context.renderer,
    keymap: keymap.keymap,
    keys: {
      formatSequence: (parts: readonly unknown[] | undefined) => parts?.map(String).join(' '),
      formatBindings: (bindings: readonly unknown[] | undefined) => bindings?.map(String).join(' / '),
    },
    mode: context.keymap.mode,
    route: {
      get current() {
        return route(context)
      },
      navigate(name: string, params?: Record<string, unknown>) {
        if (name === 'home') context.ui.router.navigate({ type: 'home' })
        else if (name === 'session' && typeof params?.sessionID === 'string')
          context.ui.router.navigate({ type: 'session', sessionID: params.sessionID })
        else context.ui.router.navigate({ type: 'plugin', name, data: params })
      },
      register: emptyUnregister,
    },
    ui,
    kv: { ready: true, get: <Value>(_key: string, fallback?: Value) => fallback, set: () => {} },
    state: {
      ready: true,
      config: { lsp: false },
      path: {
        state: stateDirectory(),
        config: process.env.OPENCODE_CONFIG_DIR ?? join(homedir(), '.config', 'opencode'),
        worktree: currentLocation.directory,
        directory: currentLocation.directory,
      },
      session: sessions.state,
      lsp: () => [],
      mcp: remote.state.mcp,
    },
    client: {
      ...remote.client,
      session: sessions.client,
    },
    event: createV2EventAdapter(context, sessions),
    theme: {
      get current() {
        return legacyTheme(context.theme)
      },
      ready: true,
      mode: () => context.themeMode,
    },
    attention: context.attention,
    lifecycle: { signal: controller.signal, onDispose },
  } as unknown as TuiPluginApi

  api.slots = createV2Slots(context, keymap, (dispose) => {
    onDispose(dispose)
  })
  setHostCapabilities(api, {
    todo: true,
    lsp: false,
    unavailable: {
      todo: 'OpenCode 2 does not expose Todo data through its supported plugin API.',
    },
  })

  return {
    api,
    async dispose() {
      controller.abort()

      for (let index = disposers.length - 1; index >= 0; index--) await disposers[index]()

      disposers.length = 0
    },
  }
}
