import { QUICK_ACTIONS, quickActionRequiresSession } from '../../../entities/quick-action/model'

import type { QuickActionId, QuickActionSource } from '../../../entities/quick-action/model'
import type { GuiSessionScope, createSelectedSessionAccess } from './selected-session'
import type { Context } from '@opencode/plugin/gui'

// Audited against the official Desktop 2.2.6 composer, session and titlebar commands.
const commands: Partial<Record<QuickActionId, string>> = {
  'session.new': 'tab.new',
  'session.list': 'sessions.search',
  'session.export': 'session.export',
  'session.compact': 'session.compact',
  'session.fork': 'session.fork',
  'session.message.next': 'message.next',
  'session.message.previous': 'message.previous',
}

export function guiQuickActionLabel(id: QuickActionId) {
  return id === 'permission.mode' ? 'Permissions settings' : QUICK_ACTIONS.find((item) => item.command === id)!.label
}

export function createGuiQuickActions(
  context: Context,
  access: ReturnType<typeof createSelectedSessionAccess>,
  scope: GuiSessionScope,
): QuickActionSource {
  function reason(id: QuickActionId): string | undefined {
    if (!access.current(scope)) return 'Session or server changed'

    if (id === 'permission.mode') return

    if (!commands[id]) return 'No equivalent published Desktop command in OpenCode 2.2.6'

    if (quickActionRequiresSession(id) && !context.sessions.current()) return 'Requires an open session'

    const requiresMessages =
      (id === 'session.compact' || id === 'session.fork') &&
      access
        .cache(scope)
        .data.session.message.list(scope.target.sessionID)
        .every((item) => item.type !== 'user')

    return requiresMessages ? 'Requires conversation messages' : undefined
  }

  function inspect(id: QuickActionId, target: Parameters<QuickActionSource['inspect']>[1]) {
    const unavailable = target?.sessionKey === scope.target.sessionKey ? reason(id) : 'Session or server changed'

    return {
      label: guiQuickActionLabel(id),
      available: !unavailable,
      reason: unavailable,
    }
  }

  return {
    inspect,
    async execute(id, target, signal) {
      signal.throwIfAborted()
      const state = inspect(id, target)

      if (!state.available) throw new Error(state.reason)

      if (id === 'permission.mode') {
        context.layout.settings('general')

        return
      }

      if (!context.commands.run(commands[id]!)) throw new Error('This action is currently unavailable in OpenCode.')
    },
  }
}
