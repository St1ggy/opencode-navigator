import { useTerminalDimensions } from '@opentui/solid'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

export function DialogSurface(props: { api: TuiPluginApi; id?: string; lift?: boolean; children: JSX.Element }) {
  const dimensions = useTerminalDimensions()

  return (
    <box
      id={props.id}
      marginTop={props.lift ? -Math.min(6, Math.max(3, Math.floor(dimensions().height / 10))) : undefined}
      backgroundColor={props.api.theme.current.backgroundPanel}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      gap={1}
    >
      {props.children}
    </box>
  )
}
