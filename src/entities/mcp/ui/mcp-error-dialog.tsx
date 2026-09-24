import { PresetMenu } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpErrorDialog(props: { api: TuiPluginApi; name: string; status: string; error: string }) {
  return (
    <PresetMenu
      api={props.api}
      title={`MCP error · ${props.name}`}
      height={12}
      options={[{ title: `Status · ${props.status}`, value: 'error', description: props.error, icon: 'error' }]}
      onSelect={() => {}}
    />
  )
}
