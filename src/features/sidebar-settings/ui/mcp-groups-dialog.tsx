import { useDialogs } from '../../../shared/ui'

import { McpGroupAssignmentDialog } from './mcp-group-assignment-dialog'
import { PresetMenu } from './preset-menu'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpGroupsDialog(props: { api: TuiPluginApi; preferences: PreferencesController; mcp: McpController }) {
  const dialogs = useDialogs(props.api)
  const options = () => {
    const live = new Set(props.mcp.list(props.mcp.target()).map((item) => item.name))

    return [...new Set([...live, ...Object.keys(props.preferences.mcpServerGroups?.() ?? {})])]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        title: name,
        value: name,
        description: [props.preferences.mcpServerGroups?.()[name] ?? 'Ungrouped', !live.has(name) && 'not in workspace']
          .filter(Boolean)
          .join(' · '),
      }))
  }

  return (
    <PresetMenu
      api={props.api}
      title="MCP groups · user-wide"
      options={options()}
      onSelect={(option) =>
        dialogs.open(() => (
          <McpGroupAssignmentDialog api={props.api} preferences={props.preferences} server={option.value} />
        ))
      }
    />
  )
}
