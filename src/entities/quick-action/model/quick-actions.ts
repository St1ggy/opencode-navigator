import { createSignal, onCleanup } from 'solid-js'

import { QUICK_ACTION_IDS, type QuickActionId } from '../../../shared/config'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type QuickAction = { icon: string; label: string; command: QuickActionId }

const QUICK_ACTION_METADATA = [
  ['\u{EA73}', 'Rename'],
  ['\u{EA82}', 'Timeline'],
  ['\u{EBCC}', 'Copy transcript'],
  ['\u{EBAC}', 'Export'],
  ['\u{EAF5}', 'Compact'],
  ['\u{EBEB}', 'Switch session'],
  ['\u{EA60}', 'New session'],
  ['\u{EB9E}', 'Fork session'],
  ['\u{EBCC}', 'Copy last response'],
  ['\u{EAA1}', 'First message'],
  ['\u{EA9A}', 'Last message'],
  ['\u{EA82}', 'Last user message'],
  ['\u{EA9A}', 'Next message'],
  ['\u{EAA1}', 'Previous message'],
  ['\u{EBB3}', 'Auto-approve permissions'],
] as const

export const QUICK_ACTIONS: readonly QuickAction[] = QUICK_ACTION_IDS.map((command, index) => ({
  command,
  icon: QUICK_ACTION_METADATA[index][0],
  label: QUICK_ACTION_METADATA[index][1],
}))

export function quickActionRequiresSession(command: QuickActionId) {
  return command !== 'session.list' && command !== 'session.new' && command !== 'permission.mode'
}

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

export function orderQuickActionIds(order: readonly QuickActionId[], favorites: ReadonlySet<QuickActionId>) {
  return [...order.filter((id) => favorites.has(id)), ...order.filter((id) => !favorites.has(id))]
}

export function quickActionDisabledReason(api: TuiPluginApi, action: QuickAction): string | undefined {
  const route = api.route.current

  if (quickActionRequiresSession(action.command) && route.name !== 'session') return 'Requires an open session'

  const getCommands = api.keymap.getCommands?.bind(api.keymap)

  if (!getCommands) return

  const command = getCommands({ visibility: 'registered' }).find((candidate) => candidate.name === action.command)

  if (!command) return 'Unavailable in this OpenCode version'

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
