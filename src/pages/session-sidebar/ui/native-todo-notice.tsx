import { useIcons } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function NativeTodoNotice(props: { api: TuiPluginApi; empty: boolean }) {
  const icons = useIcons()

  return (
    <text fg={props.api.theme.current.textMuted} wrapMode="word">
      {icons.icon('info')} Native OpenCode Todo. Edit tasks through chat and todowrite.
      {props.empty ? ' OpenCode 2.1 enables the tool through experimental.todo.' : ''}
    </text>
  )
}
