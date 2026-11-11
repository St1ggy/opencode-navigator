import { createSignal, onCleanup } from 'solid-js'

import { hostCapabilities } from '../../../shared/lib/host-capabilities'

import { type QuickAction, quickActionRequiresSession } from './catalog'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export { QUICK_ACTIONS, orderQuickActionIds, quickActionRequiresSession } from './catalog'
export type { QuickAction } from './catalog'

export function quickActionLabel(api: TuiPluginApi, action: QuickAction) {
  if (action.command !== 'permission.mode') return action.label

  const command = api.keymap
    .getCommands?.({ visibility: 'registered' })
    .find((candidate) => candidate.name === action.command)

  return typeof command?.title === 'string' ? command.title : action.label
}

export function createQuickActionRevision(api: TuiPluginApi) {
  const [revision, setRevision] = createSignal(0)
  const unsubscribe = api.keymap.on?.('state', () => setRevision((value) => value + 1))

  if (unsubscribe) onCleanup(unsubscribe)

  return revision
}

export function quickActionDisabledReason(api: TuiPluginApi, action: QuickAction): string | undefined {
  const route = api.route.current

  if (quickActionRequiresSession(action.command) && route.name !== 'session') return 'Requires an open session'

  const getCommands = api.keymap.getCommands?.bind(api.keymap)

  if (!getCommands) return

  const command = getCommands({ visibility: 'registered' }).find((candidate) => candidate.name === action.command)

  if (!command)
    return hostCapabilities(api).commandsReachableOnly
      ? 'Unavailable in the current session'
      : 'Unavailable in this OpenCode version'

  const enabled = command.enabled

  if (enabled === false || (typeof enabled === 'function' && !enabled())) return 'Unavailable in the current session'

  return undefined
}

export {
  QUICK_ACTION_IDS,
  type QuickActionId,
  type QuickActionVisibility,
  parseQuickActionOrder,
  parseQuickActionVisibility,
} from '../../../shared/config'
