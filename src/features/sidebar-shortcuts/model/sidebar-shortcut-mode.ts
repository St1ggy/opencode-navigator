import { createSignal } from 'solid-js'

import { LEGACY_PLUGIN_ID, PLUGIN_ID, TOGGLE_COMMAND } from '../../../shared/config'

import { sidebarShortcutActions } from './shortcut-actions'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const ENTRY_COMMAND = `${PLUGIN_ID}.sidebar-shortcuts.enter`
const CANCEL_COMMAND = `${PLUGIN_ID}.sidebar-shortcuts.cancel`
const MODE = `${PLUGIN_ID}.sidebar-shortcuts`
const DEFAULT_TIMEOUT_MS = 5000

export type SidebarShortcutModeOptions = {
  timeoutMs?: number
}

export function createSidebarShortcutMode(api: TuiPluginApi, options: SidebarShortcutModeOptions = {}) {
  const actions = sidebarShortcutActions(api)
  const [active, setActive] = createSignal(false)
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let shortcutKey = ''
  let unregisterBinding: (() => void) | undefined
  let unregisterMode: (() => void) | undefined
  let leaveMode: (() => void) | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  function cancel() {
    if (timeout) clearTimeout(timeout)

    timeout = undefined
    unregisterMode?.()
    unregisterMode = undefined
    leaveMode?.()
    leaveMode = undefined
    setActive(false)
  }

  function run(command: string) {
    cancel()

    if (api.route.current.name !== 'session' || api.ui?.dialog?.open) return

    return api.keymap.dispatchCommand(command)
  }

  function enter() {
    if (disposed || api.route.current.name !== 'session' || api.ui?.dialog?.open) return false

    cancel()
    unregisterMode = api.keymap.registerLayer({
      mode: MODE,
      priority: 2000,
      commands: [
        { name: ENTRY_COMMAND, run: enter },
        { name: CANCEL_COMMAND, run: cancel },
        ...actions.map(({ key, command }) => ({
          name: `${MODE}.${key}`,
          run: () => run(command),
        })),
      ],
      bindings: [
        { key: 'escape', cmd: CANCEL_COMMAND },
        { key: shortcutKey, cmd: ENTRY_COMMAND },
        ...actions.map(({ key }) => ({ key, cmd: `${MODE}.${key}` })),
      ],
    })
    leaveMode = api.mode.push(MODE)
    timeout = setTimeout(cancel, timeoutMs)
    setActive(true)

    return true
  }

  const unregisterCommands = api.keymap.registerLayer({
    mode: 'base',
    commands: [
      {
        name: TOGGLE_COMMAND,
        title: 'Toggle sidebar',
        category: 'Navigator',
        namespace: 'palette',
        enabled: () => api.route.current.name === 'session' && !api.ui?.dialog?.open,
        run: () => api.keymap.dispatchCommand('session.sidebar.toggle'),
      },
      {
        name: `${LEGACY_PLUGIN_ID}.toggle`,
        run: () => api.keymap.dispatchCommand('session.sidebar.toggle'),
      },
      {
        name: ENTRY_COMMAND,
        enabled: () => api.route.current.name === 'session' && !api.ui?.dialog?.open,
        run: enter,
      },
    ],
  })

  return {
    active,
    actions,
    bind(key: string) {
      cancel()
      unregisterBinding?.()
      shortcutKey = key
      unregisterBinding = api.keymap.registerLayer({
        mode: 'base',
        bindings: [{ key, cmd: ENTRY_COMMAND }],
      })
    },
    enter,
    cancel,
    dispose() {
      disposed = true
      cancel()
      unregisterBinding?.()
      unregisterBinding = undefined
      unregisterCommands()
    },
  }
}

export type SidebarShortcutMode = ReturnType<typeof createSidebarShortcutMode>
