import { setQuickActionStateSource } from '../../entities/quick-action'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function bindToolbarActionState(context: Plugin.Context, api: TuiPluginApi) {
  setQuickActionStateSource(api, (id) => {
    const route = context.ui.router.current()

    if (id !== 'session.compact' || route.type !== 'session') return

    const revert = context.data.session.get(route.sessionID)?.revert?.messageID

    return context.data.session.message
      .list(route.sessionID)
      .some(
        (message) => (!revert || message.id < revert) && message.type === 'compaction' && message.status === 'running',
      )
      ? 'compacting'
      : 'idle'
  })
}
