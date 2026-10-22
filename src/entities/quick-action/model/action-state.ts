import type { QuickActionId } from '../../../shared/config'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type QuickActionState = { id: string; label: string }
const sources = new WeakMap<TuiPluginApi, (id: QuickActionId) => string | undefined>()

export function setQuickActionStateSource(api: TuiPluginApi, source: (id: QuickActionId) => string | undefined) {
  sources.set(api, source)
}

export function currentPermissionMode(api: TuiPluginApi): boolean | undefined {
  const title = api.keymap
    .getCommands?.({ visibility: 'registered' })
    .find((command) => command.name === 'permission.mode')?.title

  if (typeof title !== 'string') return

  if (title.startsWith('Disable auto-approve permissions')) return true

  return title.startsWith('Enable auto-approve permissions') ? false : undefined
}

export function quickActionStates(api: TuiPluginApi, id: QuickActionId): readonly QuickActionState[] {
  if (id === 'permission.mode' && currentPermissionMode(api) !== undefined)
    return [
      { id: 'on', label: 'Auto-approve on' },
      { id: 'off', label: 'Auto-approve off' },
    ]

  if (id === 'session.compact' && sources.has(api))
    return [
      { id: 'idle', label: 'Idle' },
      { id: 'compacting', label: 'Compacting' },
    ]

  return []
}

export function quickActionState(api: TuiPluginApi, id: QuickActionId): string | undefined {
  if (id === 'permission.mode') {
    const mode = currentPermissionMode(api)

    if (mode === undefined) return undefined

    return mode ? 'on' : 'off'
  }

  return sources.get(api)?.(id)
}
