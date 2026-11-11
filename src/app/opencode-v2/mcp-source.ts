import { createNativeMcpSource } from '../native/mcp-source'

import type { Plugin } from '@opencode/plugin/tui'

export function createV2McpSource(context: Plugin.Context) {
  return createNativeMcpSource(() => context.data)
}
