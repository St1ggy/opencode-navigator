import { createV2McpSource } from './mcp-source'
import { createV2SkillSource } from './skill-source'
import { createV2SubagentSource } from './subagent-source'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function createOpenCodeV2Sources(context: Plugin.Context, api: TuiPluginApi) {
  return {
    skills: createV2SkillSource(context),
    mcp: createV2McpSource(context),
    subagents: createV2SubagentSource(context, api),
  }
}
