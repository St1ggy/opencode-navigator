import { VersionControl } from './version-control'

import type { VersionStatus } from '../model/version-status'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function VersionSummary(props: {
  api: TuiPluginApi
  navigatorVersion: string
  status: VersionStatus
  onOpenCodeUpdate: (target: string) => void
  onNavigatorUpdate: (target: string) => void
}) {
  return (
    <box flexDirection="row">
      <VersionControl
        api={props.api}
        label="OpenCode"
        version={props.api.app.version}
        update={props.status.openCodeUpdate()}
        onUpdate={props.onOpenCodeUpdate}
      />
      <text fg={props.api.theme.current.textMuted}> | </text>
      <VersionControl
        api={props.api}
        label="Navigator"
        version={props.navigatorVersion}
        update={props.status.navigatorUpdate()}
        onUpdate={props.onNavigatorUpdate}
      />
    </box>
  )
}
