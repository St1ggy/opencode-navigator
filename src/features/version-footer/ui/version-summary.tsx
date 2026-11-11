import { VersionControl } from './version-control'

import type { UpdateProgress } from '../../../entities/navigator-release/model'
import type { VersionStatus } from '../model/version-status'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function VersionSummary(props: {
  api: TuiPluginApi
  navigatorVersion: string
  status: VersionStatus
  onOpenCodeUpdate: (target: string) => void
  onNavigatorUpdate: (target: string) => void
  navigatorProgress?: UpdateProgress
  openCodeProgress?: UpdateProgress
}) {
  return (
    <box flexDirection={props.navigatorProgress || props.openCodeProgress ? 'column' : 'row'}>
      <VersionControl
        api={props.api}
        label="OpenCode"
        version={props.api.app.version}
        update={props.status.openCodeUpdate()}
        onUpdate={props.onOpenCodeUpdate}
        progress={props.openCodeProgress}
      />
      {props.navigatorProgress || props.openCodeProgress ? null : (
        <text fg={props.api.theme.current.textMuted}> | </text>
      )}
      <VersionControl
        api={props.api}
        label="Navigator"
        version={props.navigatorVersion}
        update={props.status.navigatorUpdate()}
        onUpdate={props.onNavigatorUpdate}
        progress={props.navigatorProgress}
      />
    </box>
  )
}
