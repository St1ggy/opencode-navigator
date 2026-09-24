import { LEGACY_PLUGIN_ID, PLUGIN_ID, TOGGLE_COMMAND } from '../../../shared/config'
import { supportsSidebarSection } from '../../../shared/lib/host-capabilities'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const ENTRY_COMMAND = `${PLUGIN_ID}.sidebar-shortcuts.enter`
const CANCEL_COMMAND = `${PLUGIN_ID}.sidebar-shortcuts.cancel`
const MODE = `${PLUGIN_ID}.sidebar-shortcuts`
const DEFAULT_TIMEOUT_MS = 5000

const ACTIONS = [
  { key: 'h', command: 'session.sidebar.toggle', section: undefined },
  { key: 't', command: `${PLUGIN_ID}.focus.todo`, section: 'todo' },
  { key: 'a', command: `${PLUGIN_ID}.focus.subagents`, section: 'subagents' },
  { key: 's', command: `${PLUGIN_ID}.focus.skills`, section: 'skills' },
  { key: 'q', command: `${PLUGIN_ID}.focus.quick_actions`, section: 'quick_actions' },
  { key: 'l', command: `${PLUGIN_ID}.focus.lsp`, section: 'lsp' },
  { key: 'm', command: `${PLUGIN_ID}.focus.mcp`, section: 'mcp' },
] as const

export type SidebarShortcutModeOptions = {
  timeoutMs?: number
}

export function createSidebarShortcutMode(api: TuiPluginApi, options: SidebarShortcutModeOptions = {}) {
  const actions = ACTIONS.filter(({ section }) => !section || supportsSidebarSection(api, section))
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
  }

  function run(command: string) {
    cancel()

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
    api.ui?.toast?.({
      variant: 'info',
      title: 'Navigator shortcuts',
      message: 'h toggle | t todo | a agents | s skills | q actions | l LSP | m MCP | Esc cancel',
      duration: timeoutMs,
    })

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
    active: () => leaveMode !== undefined,
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
