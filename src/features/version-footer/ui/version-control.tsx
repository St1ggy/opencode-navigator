import { useIcons } from '../../../shared/ui'

import { VersionInstallProgress } from './install-progress'

import type { UpdateProgress } from '../../../entities/navigator-release/model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function VersionControl(props: {
  api: TuiPluginApi
  label: string
  version: string
  update?: string
  onUpdate?: (target: string) => void
  progress?: UpdateProgress
}) {
  const icons = useIcons()
  const theme = () => props.api.theme.current

  return (
    <box
      flexDirection="row"
      onMouseDown={(event) => {
        if (props.update) event.stopPropagation()
      }}
      onMouseUp={(event) => {
        const update = props.update

        if (!update || props.progress) return

        event.stopPropagation()
        props.onUpdate?.(update)
      }}
    >
      {props.progress ? (
        <VersionInstallProgress api={props.api} label={props.label} progress={props.progress} />
      ) : (
        <text fg={theme().textMuted}>
          {props.label} {props.version}
        </text>
      )}
      {props.update && !props.progress ? <text fg={theme().warning}>{icons.icon('update')}</text> : null}
    </box>
  )
}
