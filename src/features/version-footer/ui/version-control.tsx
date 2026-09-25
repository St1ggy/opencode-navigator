import { useIcons } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function VersionControl(props: {
  api: TuiPluginApi
  label: string
  version: string
  update?: string
  onUpdate?: (target: string) => void
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

        if (!update) return

        event.stopPropagation()
        props.onUpdate?.(update)
      }}
    >
      <text fg={theme().textMuted}>
        {props.label} {props.version}
      </text>
      {props.update ? <text fg={theme().warning}>{icons.icon('update')}</text> : null}
    </box>
  )
}
