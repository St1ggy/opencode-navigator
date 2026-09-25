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
    <box flexDirection="row">
      <text fg={theme().textMuted}>
        {props.label} {props.version}
      </text>
      {props.update ? (
        <text
          fg={theme().warning}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            const update = props.update

            if (update) props.onUpdate?.(update)
          }}
        >
          {icons.icon('up')}
        </text>
      ) : null}
    </box>
  )
}
