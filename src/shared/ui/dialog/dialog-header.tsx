import { TextAttributes } from '@opentui/core'

import { useIcons } from '../icons'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function DialogHeader(props: { api: TuiPluginApi; title: string; onBack: () => void }) {
  const icons = useIcons()

  return (
    <box flexDirection="row" gap={1} justifyContent="space-between">
      <text
        fg={props.api.theme.current.text}
        attributes={TextAttributes.BOLD}
        wrapMode="none"
        truncate
        height={1}
        flexGrow={1}
      >
        {icons.icon('presets')} {props.title}
      </text>
      <text
        fg={props.api.theme.current.textMuted}
        flexShrink={0}
        onMouseUp={(event) => {
          event.stopPropagation()
          props.onBack()
        }}
      >
        {icons.key('esc')}
      </text>
    </box>
  )
}
