/** @jsxImportSource @opentui/solid */
import { useIcons } from '../../../shared/ui'

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
}) {
  const theme = () => props.api.theme.current
  const icons = useIcons()
  const path = () => footerPath(props.api, props.sessionID)
  const versions = () =>
    `OpenCode ${props.api.app.version}${props.status.openCodeUpdate() ? icons.icon('up') : ''} | ` +
    `Navigator ${props.navigatorVersion}${props.status.navigatorUpdate() ? icons.icon('up') : ''}`

  return (
    <box gap={1}>
      <text fg={theme().text}>{path()}</text>
      <text fg={theme().textMuted}>{versions()}</text>
    </box>
  )
}
