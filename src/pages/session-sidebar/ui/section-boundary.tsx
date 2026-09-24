import { RGBA } from '@opentui/core'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

export function SectionBoundary(props: { api: TuiPluginApi; divided: boolean; children: JSX.Element }) {
  const dividerColor = () => {
    const { backgroundPanel, borderSubtle } = props.api.theme.current

    return RGBA.fromValues(
      backgroundPanel.r + (borderSubtle.r - backgroundPanel.r) * 0.45,
      backgroundPanel.g + (borderSubtle.g - backgroundPanel.g) * 0.45,
      backgroundPanel.b + (borderSubtle.b - backgroundPanel.b) * 0.45,
    )
  }

  return (
    <box {...(props.divided ? { border: ['bottom'] as const, borderColor: dividerColor(), paddingBottom: 1 } : {})}>
      {props.children}
    </box>
  )
}
