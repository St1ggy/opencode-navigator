/** @jsxImportSource @opentui/solid */
import { useIcons } from '../../../shared/ui'

import type { VersionStatus } from '../model/version-status'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function NavigatorVersion(props: { api: TuiPluginApi; navigatorVersion: string; status: VersionStatus }) {
  const icons = useIcons()
  const label = () => `Navigator ${props.navigatorVersion}${props.status.navigatorUpdate() ? icons.icon('up') : ''}`

  return <text fg={props.api.theme.current.textMuted}>{label()}</text>
}
