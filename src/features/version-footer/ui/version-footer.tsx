import { VersionSummary } from './version-summary'

import type { VersionStatus } from '../model/version-status'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function footerPath(api: TuiPluginApi, sessionID: string) {
  const directory = api.state.session.get(sessionID)?.directory || api.state.path.directory
  const home = process.env.HOME
  const compact = home && directory.startsWith(`${home}/`) ? `~${directory.slice(home.length)}` : directory
  const branch = directory === api.state.path.directory ? api.state.vcs?.branch : undefined

  return `${compact}${branch ? `:${branch}` : ''}`
}

export function VersionFooter(props: {
  api: TuiPluginApi
  sessionID: string
  navigatorVersion: string
  status: VersionStatus
  onOpenCodeUpdate: (target: string) => void
  onNavigatorUpdate: (target: string) => void
}) {
  const theme = () => props.api.theme.current
  const path = () => footerPath(props.api, props.sessionID)

  return (
    <box gap={1}>
      <text fg={theme().text}>{path()}</text>
      <VersionSummary
        api={props.api}
        navigatorVersion={props.navigatorVersion}
        status={props.status}
        onOpenCodeUpdate={props.onOpenCodeUpdate}
        onNavigatorUpdate={props.onNavigatorUpdate}
      />
    </box>
  )
}
