import { createNativeSubagentSource } from '../native/subagent-source'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { Plugin } from '@opencode/plugin/tui'

export function createV2SubagentSource(context: Plugin.Context, api: TuiPluginApi) {
  return createNativeSubagentSource({
    sessions: () => context.data.session,
    client: () => context.client,
    project: (info) => api.state.session.get(info.id),
    status: (id) => api.state.session.status(id) ?? { type: 'idle' },
  })
}
