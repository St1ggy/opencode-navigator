import type { SubagentSource } from '../../entities/subagent'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createV2SubagentSource(context: Plugin.Context, api: TuiPluginApi): SubagentSource {
  return {
    list: (parentID) =>
      context.data.session
        .list()
        .filter((item) => item.parentID === parentID)
        .flatMap((item) => {
          const value = api.state.session.get(item.id)

          return value ? [value] : []
        }),
    status: (id) => api.state.session.status(id) ?? { type: 'idle' },
    async refresh(parentID, signal) {
      signal.throwIfAborted()
      let cursor: NonNullable<Parameters<typeof context.client.session.list>[0]>['cursor']

      do {
        const page = await context.client.session.list(cursor ? { cursor, limit: 100 } : { parentID, limit: 100 }, {
          signal,
        })

        await Promise.all(
          page.data
            .filter((item) => !context.data.session.get(item.id))
            .map((item) => context.data.session.sync(item.id)),
        )
        cursor = page.cursor.next ?? undefined
        signal.throwIfAborted()
      } while (cursor)
    },
  }
}
