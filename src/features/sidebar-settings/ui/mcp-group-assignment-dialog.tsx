import { GroupAssignmentDialog } from './group-assignment-dialog'

import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpGroupAssignmentDialog(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  server: string
}) {
  return (
    <GroupAssignmentDialog
      api={props.api}
      title={`Group for ${props.server}`}
      assigned={() => props.preferences.mcpServerGroups?.()[props.server]}
      groups={() =>
        [...new Set(Object.values(props.preferences.mcpServerGroups?.() ?? {}))].sort((a, b) => a.localeCompare(b))
      }
      onAssign={(group) => props.preferences.setMcpServerGroup?.(props.server, group)}
    />
  )
}
